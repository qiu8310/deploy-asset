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

var _qiniu = require('qiniu');

var _qiniu2 = _interopRequireDefault(_qiniu);

var QiniuUploader = (function (_Uploader) {
  _inherits(QiniuUploader, _Uploader);

  function QiniuUploader() {
    _classCallCheck(this, QiniuUploader);

    _get(Object.getPrototypeOf(QiniuUploader.prototype), 'constructor', this).apply(this, arguments);
  }

  _createClass(QiniuUploader, [{
    key: 'beforeInitOpts',

    /**
     * @override
     * @borrows Uploader.beforeInitOpts
     */
    value: function beforeInitOpts(opts) {
      if (!opts.ak && !opts.sk && !opts.bucket && !opts.domain) {
        this.log.warn('你当前使用的是 ^七牛上传器^ ');
        this.log.warn('你没有配置任何的七牛配置，所以默认使用了一个公共的七牛帐号');
        this.log.warn('此公共帐号 #无法上传 html 文件# ，你可以去七牛官网申请一个免费的帐号即可');

        opts.ak = '6mU6vJ3h3ffH4DrPaAyH1SDsDMktTjpBq0U6Zo8G';
        opts.sk = '0Haz628E6jxjRwdXUiYpbH4jApz019XM6L6Ykl0M';
        opts.bucket = 'depot-asset';
        opts.domain = '7ximfq.com1.z0.glb.clouddn.com';
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
      _qiniu2['default'].conf.ACCESS_KEY = this.opts.ak;
      _qiniu2['default'].conf.SECRET_KEY = this.opts.sk;
      this.client = new _qiniu2['default'].rs.Client();
    }

    /**
     * @override
     * @borrows Uploader.destroyService
     */
  }, {
    key: 'destroyService',
    value: function destroyService() {
      this.client = null;
    }

    /**
     * @override
     * @borrows Uploader.uploadFile
     */
  }, {
    key: 'uploadFile',
    value: function uploadFile(file, done) {
      // bucket:filename => 覆盖式上传
      var filePath = this.env.getFileRemotePath(file, false);
      var token = new _qiniu2['default'].rs.PutPolicy(this.opts.bucket + ':' + filePath).token();
      var extra = new _qiniu2['default'].io.PutExtra({}, file.mimeType);
      _qiniu2['default'].io.put(token, filePath, file.remote.content, extra, function (err, ret) {
        if (err) return done(err);
        done(null, ret);
      });
    }

    /**
     * @override
     * @borrows Uploader.isRemoteFileExists
     */
  }, {
    key: 'isRemoteFileExists',
    value: function isRemoteFileExists(file, done) {
      this.client.stat(this.opts.bucket, this.env.getFileRemotePath(file, false), function (err) {
        if (err) {
          if (err.code === 612) return done(null, false);
          return done(err);
        }
        done(null, true);
      });
    }

    /**
     * @override
     * @borrows Uploader.getRemoteFileContent
     */
  }, {
    key: 'getRemoteFileContent',
    value: function getRemoteFileContent(file, done) {
      this.constructor.download(file.remote.url, function (err, buffer) {
        done(err, err ? null : buffer);
      });
    }

    /**
     * @override
     * @borrows Uploader.removeRemoteFile
     */
  }, {
    key: 'removeRemoteFile',
    value: function removeRemoteFile(file, done) {
      this.client.remove(this.opts.bucket, this.env.getFileRemotePath(file, false), function (err, ret) {
        if (err) return done(err);
        done(null, ret);
      });
    }
  }]);

  return QiniuUploader;
})(_Uploader3['default']);

QiniuUploader.config = {
  error: {
    ak: '七牛 Access Key',
    sk: ['七牛 Secret Key',, true],
    bucket: '七牛 空间',
    domain: '七牛 当前空间的域名'
  }
};

exports['default'] = QiniuUploader;
module.exports = exports['default'];