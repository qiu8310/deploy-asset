/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var FTP = require('jsftp-mkdirp')(require('jsftp'));
var path = require('x-path');
var log = require('npmlog');
var async = require('async');
var _ = require('lodash');


var Uploader = require('../uploader');


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
  var appendDestDirToBaseUrl = ('appendDestDirToBaseUrl' in opts) ? opts.appendDestDirToBaseUrl : true;

  log.info('Create ftp');
  self.ftp = new FTP({host: self.host, user: self.user, pass: self.pass, port: self.port});

  self.baseUrl = self.normalizeBaseUrl(opts.baseUrl);
  self.destDir = path.normalizePathSeparate(self.destDir);
  if (appendDestDirToBaseUrl) self.baseUrl += self.destDir.replace(/^\/|\/$/g, '') + '/';
  self.enableBatchUpload = true;
  self.supportFlatAssets = true;
}


FtpUploader.prototype.endFtp = function () {
  this.ftp.raw.quit(function (err) {
    if (err) {
      log.warn('FTP connection ended with error', err);
    }
  });
};

FtpUploader.prototype.cwdFtp = function (dir, cb) {
  var self = this;
  this.ftp.mkdirp(dir, function (err) {
    if (err) return cb(err);
    self.ftp.raw.cwd(dir, cb);
  });
};


/**
 *
 * @method
 * @override
 *
 * @borrows Uploader.setFileRemotePath
 */
FtpUploader.prototype.setFileRemotePath = function(file) {
  var dest = path.join(file.remote.relative, file.remote.basename);
  file.remote.path = this.baseUrl + path.normalizePathSeparate(dest);
};

/**
 *
 * @method
 * @override
 * @borrows Uploader.uploadFile
 */
FtpUploader.prototype.batchUploadFiles = function(files, cb) {
  var self = this;

  var end = function (err) {
    self.endFtp();
    cb(err);
  };

  var iterate = function (file, done) {
    var relative = file.remote.relative;
    var remotePath = path.normalizePathSeparate(path.join(relative, file.remote.basename));
    var put = function () {
      self.ftp.put(file.content, remotePath, done);
    };

    if (!relative) return put();

    self.ftp.mkdirp(path.join(self.destDir, relative), function (err) {
      if (err) return done(err);
      put();
    });
  };

  this.cwdFtp(this.destDir, function (err) {
    if (err) return end(err);
    async.eachSeries(files, iterate, end);
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
