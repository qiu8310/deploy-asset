/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var FTP = require('jsftp');
var path = require('path');
var log = require('npmlog');
var async = require('async');
var _ = require('lodash');


var Uploader = require('../uploader');




function _findUp (ftp, dir, cb, stack) {
  stack = stack || [];
  log.info('Try cwd to', dir);
  ftp.raw.cwd(dir, function (err) {
    if (err) {
      if (err.code === 550) {
        stack.unshift(path.basename(dir));
        _findUp(ftp, path.dirname(dir), cb, stack);
      } else {
        cb(err);
      }
    } else {
      log.info('Success cwd to', dir);
      if (stack.length === 0) {
        cb();
      } else {
        _findDown(ftp, '', stack, cb);
      }
    }
  });
}

function _findDown (ftp, dir, stack, cb) {
  if (stack.length === 0) {
    ftp.raw.cwd(dir, cb);
  } else {
    dir = path.join(dir, stack.shift());
    log.info('Mkdir', dir);
    ftp.raw.mkd(dir, function (err) {
      if (err) {
        cb(err);
      } else {
        _findDown(ftp, dir, stack, cb);
      }
    });
  }
}


/**
 *
 * 这里你可以检查用户配置，如果配置有误可以抛出异常
 *
 * @constructor FtpUploader
 * @extends Uploader
 * @param {Object} opts
 * @param {String} opts.host      - FTP 域名
 * @param {String} opts.user      - FTP 用户名
 * @param {String} opts.pass      - FTP 密码
 * @param {Number} opts.port      - FTP 端口，可选配置，默认是 22
 * @param {String} opts.destDir   - 要上传到 FTP 上的的目录
 * @param {String} opts.baseUrl   - 站点基准 url
 *
 *
 */
function FtpUploader(opts) {

  var self = this;
  ['host', 'user', 'pass', 'destDir', 'baseUrl'].forEach(function(key) {
    if (!opts[key] && !_.isString(opts[key])) {
      throw new Error('Please set your ftp\'s ' + key + ' option to a valid String value');
    }
    self[key] = opts[key];
  });

  self.port = opts.port || 21;

  log.info('Create ftp');
  self.ftp = new FTP({host: self.host, user: self.user, pass: self.pass, port: self.port});

  self.baseUrl = self.normalizeBaseUrl(opts.baseUrl);
  self.enableBatchUpload = true;
}


FtpUploader.prototype.endFtp = function () {
  this.ftp.raw.quit(function (err) {
    if (err) {
      log.warn('FTP connection ended with error', err);
    }
  });
};

FtpUploader.prototype.cwdFtp = function (dir, cb) {
  _findUp(this.ftp, dir, cb);
};


/**
 *
 * @method
 * @override
 *
 * @borrows Uploader.setFileRemotePath
 */
FtpUploader.prototype.setFileRemotePath = function(file) {
  file.remote.path = this.baseUrl + file.remote.basename;
};

/**
 *
 * @method
 * @override
 * @borrows Uploader.uploadFile
 */
FtpUploader.prototype.batchUploadFiles = function(files, cb) {
  var self = this;
  this.cwdFtp(this.destDir, function (err) {
    if (err) {
      self.endFtp();
      return cb(err);
    }
    async.eachSeries(
      files,
      function (file, done) {
        self.ftp.put(file.content, file.remote.basename, done);
      },
      function (err) {
        self.endFtp();
        cb(err);
      }
    );
  });
};


/* 为了生成好看点的 jsdoc 文档才这样写的 */
module.exports = Uploader.extend({
  constructor: FtpUploader,
  cwdFtp: FtpUploader.prototype.cwdFtp,
  endFtp: FtpUploader.prototype.endFtp,
  setFileRemotePath: FtpUploader.prototype.setFileRemotePath,
  batchUploadFiles: FtpUploader.prototype.batchUploadFiles
});
