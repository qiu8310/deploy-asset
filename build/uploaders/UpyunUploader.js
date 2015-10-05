/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Uploader2 = require('./Uploader');

var _Uploader3 = _interopRequireDefault(_Uploader2);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _upyun = require('upyun');

var _upyun2 = _interopRequireDefault(_upyun);

var UpyunUploader = (function (_Uploader) {
  _inherits(UpyunUploader, _Uploader);

  function UpyunUploader() {
    _classCallCheck(this, UpyunUploader);

    _get(Object.getPrototypeOf(UpyunUploader.prototype), 'constructor', this).apply(this, arguments);
  }

  _createClass(UpyunUploader, [{
    key: '_mkdirp',
    value: function _mkdirp(dir, done) {
      var _this = this;

      this.upyun.existsFile(dir, function (err, res) {
        if (err) return done(err);

        if (res.error) {
          // 文件不存在，需要重新创建
          _this.upyun.createDir(dir, function (err, res) {
            done(err || res.error, dir);
          });
        } else {
          // 文件存在，直接返回
          done(null, dir);
        }
      });
    }

    /**
     * @override
     * @borrows Uploader.beforeInitOpts
     */
  }, {
    key: 'beforeInitOpts',
    value: function beforeInitOpts(opts) {
      if (!opts.operator && !opts.password && !opts.bucket && !opts.domain) {
        this.log.warn('你当前使用的是 ^又拍云上传器^ ');
        this.log.warn('你没有配置任何的又拍云配置，所以默认使用了一个公共的又拍云帐号');
        this.log.warn('此公共帐号 #随时可能被禁用# ，你可以去又拍云官网申请一个免费的帐号即可');

        opts.operator = 'dao';
        opts.password = 'da-deploy-asset';
        opts.bucket = 'da-deploy-asset';
        opts.domain = 'da-deploy-asset.b0.upaiyun.com';
      }

      return opts;
    }

    /**
     * @override
     * @borrows Uploader.initService
     */
  }, {
    key: 'initService',
    value: function initService() {
      var _opts = this.opts;
      var bucket = _opts.bucket;
      var operator = _opts.operator;
      var password = _opts.password;
      var endpoint = _opts.endpoint;
      var apiVersion = _opts.apiVersion;

      this.upyun = new _upyun2['default'](bucket, operator, password, endpoint, apiVersion);
    }

    /**
     * @override
     * @borrows Uploader.destroyService
     */
  }, {
    key: 'destroyService',
    value: function destroyService() {
      this.upyun = null;
    }

    /**
     * @override
     * @borrows Uploader.uploadFile
     */
  }, {
    key: 'uploadFile',
    value: function uploadFile(file, done) {
      var _this2 = this;

      var filePath = this.env.getFileRemotePath(file);
      this._mkdirp(this.env.getFileRemoteDir(file), function (err) {
        if (err) return done(err);
        _this2.upyun.uploadFile(filePath, file.remote.content, file.mimeType, true, function (err, res) {
          if (err || res.error) return done(err || res.error);
          done(null, res);
        });
      });
    }

    /**
     * @override
     * @borrows Uploader.isRemoteFileExists
     */
  }, {
    key: 'isRemoteFileExists',
    value: function isRemoteFileExists(file, done) {
      this.upyun.existsFile(this.env.getFileRemotePath(file), function (err, res) {
        if (err) return done(err);
        if (res.error) {
          if (res.error.code === 404) done(null, false);else done(res.error);
        } else {
          done(null, true);
        }
      });
    }

    /**
     * @override
     * @borrows Uploader.getRemoteFileContent
     */
  }, {
    key: 'getRemoteFileContent',
    value: function getRemoteFileContent(file, done) {
      var tmpFilePath = this.constructor.getLocalTmpFilePath();
      var clear = function clear() {
        return _fsExtra2['default'].removeSync(tmpFilePath);
      };

      this.upyun.downloadFile(this.env.getFileRemotePath(file), tmpFilePath, function (err, rtn) {
        if (err || rtn.error || rtn.statusCode >= 400) {
          clear();
          return done(err || rtn);
        }

        _fsExtra2['default'].readFile(tmpFilePath, function (err, rtn) {
          clear();
          done(err, rtn);
        });
      });
    }

    /**
     * @override
     * @borrows Uploader.removeRemoteFile
     */
  }, {
    key: 'removeRemoteFile',
    value: function removeRemoteFile(file, done) {
      this.upyun.removeFile(this.env.getFileRemotePath(file), function (err, res) {
        if (err || res.error) return done(err || res.error);
        done(null, res);
      });
    }
  }]);

  return UpyunUploader;
})(_Uploader3['default']);

UpyunUploader.config = {
  error: {
    operator: '又拍云 操作员',
    password: ['又拍云 操作员密码',, true],
    bucket: '又拍云 空间',
    domain: '又拍云 当前空间的域名'
  },
  verbose: {
    endpoint: ['又拍云 节点', 'v0'],
    apiVersion: ['又拍云 接口版本', 'legacy']
  }
};

exports['default'] = UpyunUploader;
module.exports = exports['default'];