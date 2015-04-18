/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

/* jshint unused: vars */
var log = require('npmlog');
var Base = require('class-extend');

/**
 *
 * 上传组件的基类
 *
 * @mixin
 * @param {Object} opts - 上传模块需要的配置， 由 {@link da}.opts.uploaderOptions 透传过来的
 * @constructor
 *
 */
function Uploader(opts) {

  /**
   * 是否启用批量上传模式
   *
   * 如果启用了，会调用 {@link Uploader.batchUploadFiles} 来上传文件，否则调用 {@link Uploader.uploadFile} 来上传
   *
   * @type {Boolean}
   */
  this.enableBatchUpload = false;
}

/**
 *
 * 通过当前文件信息，得到此文件在远程服务器上的 http 地址（文件还没上传）
 *
 * 在此函数中，你要做的事就是更新 `file.remote.path` 的值，将其改为 `此文件上传后的远程路径`，它默认值是 `null`
 *
 * @abstract
 * @param {String} file - 当前文件的 {@link File} 对象
 * @see QiniuUploader.setFileRemotePath
 */
Uploader.prototype.setFileRemotePath = function(file) {
  throw new Error('Abstract method');
};


/**
 *
 * 异步上传一个文件
 *
 * @abstract
 * @param {File} file - 要上传的文件对像
 * @param {UploaderCallback} cb - 上传后的回调函数
 */
Uploader.prototype.uploadFile = function(file, cb) {
  throw new Error('Abstract method');
};


/**
 * 异步批量上传文件
 *
 * @abstract
 * @param {Array} files - {@link File} 数组
 * @param {UploaderCallback} cb - 上传后的回调函数
 */
Uploader.prototype.batchUploadFiles = function(files, cb) {
  throw new Error('Abstract method');
};


var cache = {};

/**
 *
 * 注册新的上传组件，请用 `da.registerUploader` 形式调用
 *
 * 如何写新的 uploader，可以参考 {@link QiniuUploader}
 *
 * @param {String} name - 模块名称
 * @param {Uploader} uploader - uploader
 * @see QiniuUploader
 */
Uploader.register = function(name, uploader) {
  log.info('Register uploader', name);
  cache[name] = uploader;
};


/**
 * 实例化一个 Uploader，如果指定的 name 不存在，会抛出异常
 *
 * 如果要定义一个自己的 Uploader，参考 {@link Uploader.register}
 *
 * @param {String} name - 要 实例化的 Uploader 名称
 * @param {Object} opts - 给 要实例化的 Uploader 初始化用
 * @throws {Error}
 */
Uploader.instance = function(name, opts) {
  if (name in cache) {
    return new cache[name](opts);
  }

  throw new Error('Uploader ' + name + ' not exists.');
};


/**
 * 用于子类继承 Uploader 类
 *
 * @static
 * @type {Function}
 * @method
 * @see https://github.com/SBoudrias/class-extend
 */
Uploader.extend = Base.extend;

module.exports = Uploader;
