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
  qiniu = require('qiniu');

var Uploader = require('../uploader');


/**
 *
 * 这里你可以检查用户配置，如果配置有误可以抛出异常
 *
 * @constructor QiniuUploader
 * @extends Uploader
 * @param {Object} opts
 * @param {String} opts.ak      - 七牛的 access-key
 * @param {String} opts.sk      - 七牛的 secret-key
 * @param {String} opts.bucket  - 七牛的 bucket
 * @param {String} opts.domain  - 七牛的默认域名
 *
 */
function QiniuUploader(opts) {
  if (!opts.ak && !opts.sk && !opts.bucket && !opts.domain) {
    log.warn('Qiniu setting', 'You are using a public qiniu setting, it may not work.');
    log.warn('Qiniu setting');
    log.warn('Qiniu setting', 'You can register an account yourself in http://www.qiniu.com/');

    opts = _.assign({
      ak: '6mU6vJ3h3ffH4DrPaAyH1SDsDMktTjpBq0U6Zo8G',
      sk: '0Haz628E6jxjRwdXUiYpbH4jApz019XM6L6Ykl0M',
      bucket: 'depot-asset',
      domain: '7ximfq.com1.z0.glb.clouddn.com'
    }, opts);
  }

  var self = this;
  ['ak', 'sk', 'bucket', 'domain'].forEach(function(key) {
    if (!opts[key] && !_.isString(opts[key])) {
      throw new Error('Please set your qiniu\'s ' + key + ' option to valid String Value');
    }
    self[key] = opts[key];
  });

  qiniu.conf.ACCESS_KEY = self.ak;
  qiniu.conf.SECRET_KEY = self.sk;
  self.domain = self.domain.replace(/^(\w+:\/\/)?.*?(\/)?$/, function(raw, prefix, postfix) {
    return (prefix || 'http://') + raw + (postfix || '/');
  });
}


/**
 *
 * @method
 * @override
 *
 * @borrows Uploader.setFileRemotePath
 */
QiniuUploader.prototype.setFileRemotePath = function(file) {
  file.remote.path = this.domain + file.remote.basename;
};

/**
 *
 * @method
 * @override
 * @borrows Uploader.uploadFile
 */
QiniuUploader.prototype.uploadFile = function(file, cb) {
  var self = this;
  var token = new qiniu.rs.PutPolicy(self.bucket + ':' + file.remote.basename).token();

  var extra = new qiniu.io.PutExtra({}, mime.lookup(file.path));
  //var extra = new qiniu.io.PutExtra();

  //qiniu.io.putFile(token, file.remote.basename, file.path, extra, function(err, ret) {
  qiniu.io.put(token, file.remote.basename, file.content, extra, function(err, ret) {
    cb( err, ret );
  });
};


/* 为了生成好看点的 jsdoc 文档才这样写的 */
module.exports = Uploader.extend({
  constructor: QiniuUploader,
  setFileRemotePath: QiniuUploader.prototype.setFileRemotePath,
  uploadFile: QiniuUploader.prototype.uploadFile
});
