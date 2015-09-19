/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var _ = require('lodash'),
  log = require('npmlog'),
  mime = require('mime'),
  path = require('path'),
  Upyun = require('upyun');

var Uploader = require('../uploader');


function normalizeDir(dir) {
  if (!dir) { return '/'; }

  dir = path.normalize(dir);
  if (dir === '' || dir === '/' || dir === '\\') { return '/'; }

  // 保证 dir 前后都有 /
  return dir.replace(/\\/g, '/').replace(/^([^\/])/, '/$1').replace(/([^\/])$/, '$1/');
}

function setupDestDir(upyun, dir, cb) {
  upyun.existsFile(dir, function (err, res) {
    if (err) {
      cb(err);
    } else {
      if (res.error) { // 文件不存在，需要重新创建
        upyun.createDir(dir, function (err, res) {
          cb(err || res.error, dir);
        });
      } else { // 文件存在，直接返回
        cb(null, dir);
      }
    }
  });
}


/**
 *
 * 这里你可以检查用户配置，如果配置有误可以抛出异常
 *
 * @constructor UpyunUploader
 * @extends Uploader
 * @param {Object} opts
 * @param {String} opts.operator    - 又拍云 的 操作员
 * @param {String} opts.password    - 又拍云 的 操作员密码
 * @param {String} opts.bucket      - 又拍云 的 bucket
 * @param {String} opts.domain      - 又拍云 的默认域名，如果不设置，默认是被配置为 [bucket].b0.upaiyun.com
 * @param {String} opts.destDir     - 要上传到的目标文件夹，默认使用根目录
 * @param {String} opts.endpoint    - 又拍云 的 endpoint，默认是 v0
 * @param {String} opts.apiVersion  - 又拍云 的 apiVersion，默认是 legacy，并且当前只能是此值
 */
function UpyunUploader(opts) {
  var self = this;
  ['operator', 'password', 'bucket'].forEach(function(key) {
    if (!opts[key] && !_.isString(opts[key])) {
      throw new Error('Please set your upyun\'s ' + key + ' option to a valid String value');
    }
    self[key] = opts[key];
  });

  self.domain = opts.domain;
  if (!self.domain) {
    self.domain = self.bucket + '.b0.upaiyun.com';
    log.warn('upyun setting', 'not set domain, use default domain: ' + self.domain);
  }

  if (!opts.endpoint) { opts.endpoint = 'v0'; }
  if (!opts.apiVersion) { opts.apiVersion = 'legacy'; }

  self.destDir = normalizeDir(opts.destDir);
  self.domain = self.normalizeBaseUrl(self.domain);
  self.upyun = new Upyun(self.bucket, self.operator, self.password, self.endpoint, self.apiVersion);

  self.supportFlatAssets = true;
}


UpyunUploader.prototype.getDestFile = function(file) {
  return path.join(this.destDir, file.remote.relative, file.remote.basename);
};

/**
 *
 * @method
 * @override
 *
 * @borrows Uploader.setFileRemotePath
 */
UpyunUploader.prototype.setFileRemotePath = function(file) {
  file.remote.path = this.domain + this.getDestFile(file).slice(1);
};

/**
 *
 * @method
 * @override
 * @borrows Uploader.uploadFile
 */
UpyunUploader.prototype.uploadFile = function(file, cb) {
  var self = this;
  var destFile = this.getDestFile(file);
  var destDir = path.dirname(destFile);
  var destFileType = mime.lookup(file.path);

  setupDestDir(this.upyun, destDir, function(err) {
    if (err) return cb(self.normalizeError(err));
    self.upyun.uploadFile(destFile, file.content, destFileType, true, function(err, res) {
      cb(self.normalizeError(err || res.error));
    });
  });
};


/* 为了生成好看点的 jsdoc 文档才这样写的 */
module.exports = Uploader.extend({
  constructor: UpyunUploader,
  getDestFile: UpyunUploader.prototype.getDestFile,
  setFileRemotePath: UpyunUploader.prototype.setFileRemotePath,
  uploadFile: UpyunUploader.prototype.uploadFile
});
