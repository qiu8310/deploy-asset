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

var FTP = require('jsftp-mkdirp')(require('jsftp'));

var FtpUploader = (function (_Uploader) {
  _inherits(FtpUploader, _Uploader);

  function FtpUploader() {
    _classCallCheck(this, FtpUploader);

    _get(Object.getPrototypeOf(FtpUploader.prototype), 'constructor', this).apply(this, arguments);
  }

  _createClass(FtpUploader, [{
    key: 'initService',

    /**
     * @override
     * @borrows Uploader.initService
     */
    value: function initService() {
      var opts = this.opts;
      this.ftp = new FTP({
        host: opts.host,
        user: opts.user,
        pass: opts.pass,
        port: opts.port
      });
    }

    /**
     * @override
     * @borrows Uploader.destroyService
     */
  }, {
    key: 'destroyService',
    value: function destroyService(done) {
      var _this = this;

      this.ftp.raw.quit(function (err) {
        if (err) _this.log.error('FTP connection ended with error', err);
        done(err);
      });
    }

    /**
     * @override
     * @borrows Uploader.uploadFile
     */
  }, {
    key: 'uploadFile',
    value: function uploadFile(file, done) {
      var _this2 = this;

      this.ftp.mkdirp(this.env.getFileRemoteDir(file), function (err) {
        if (err) return done(err);
        _this2.ftp.put(file.remote.content, _this2.env.getFileRemotePath(file), done);
      });
    }

    /**
     * @override
     * @borrows Uploader.isRemoteFileExists
     */
  }, {
    key: 'isRemoteFileExists',
    value: function isRemoteFileExists(file, done) {
      this.ftp.ls(this.env.getFileRemotePath(file), function (err, res) {
        if (err) {
          if (err.code === 550) done(null, false);else done(err);
        } else {
          if (res && res.length === 1 && res[0].name === file.remote.basename) done(null, true);else done(new Error('UNKNOWN'));
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

      this.ftp.get(this.env.getFileRemotePath(file), tmpFilePath, function (err) {
        if (!err) {
          _fsExtra2['default'].readFile(tmpFilePath, function (err, rtn) {
            clear();
            done(err, rtn);
          });
        } else {
          clear();
          done(err);
        }
      });
    }

    /**
     * @override
     * @borrows Uploader.removeRemoteFile
     */
  }, {
    key: 'removeRemoteFile',
    value: function removeRemoteFile(file, done) {
      this.ftp.raw.dele(this.env.getFileRemotePath(file), done);
    }
  }]);

  return FtpUploader;
})(_Uploader3['default']);

FtpUploader.config = {
  error: {
    host: 'FTP 域名',
    user: 'FTP 用户名',
    pass: ['FTP 密码',, true],
    baseUrl: 'FTP 服务器基准 URL'
  },
  verbose: {
    port: ['FTP 端口号', 21]
  }
};

exports['default'] = FtpUploader;
module.exports = exports['default'];