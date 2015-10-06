'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _slash = require('slash');

var _slash2 = _interopRequireDefault(_slash);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

/**
 * 远程服务器相关的环境
 */

var ServerEnv = (function () {
  function ServerEnv(opts) {
    _classCallCheck(this, ServerEnv);

    /**
     * 根目录
     * @type {string}
     */
    this.destDir = 'destDir' in opts ? opts.destDir : '/';

    var uploaderOpts = opts.uploader ? opts.uploader.opts : opts.uploaderOpts;

    var baseUrl = opts.baseUrl || uploaderOpts.baseUrl || uploaderOpts.domain;
    if (!baseUrl) throw new Error('NO_SPECIFY_BASE_URL');

    /**
     * 远程服务器的基本 URL
     * @type {string}
     */
    this.baseUrl = _util2['default'].normalizeBaseUrl(baseUrl);

    /**
     * 是否要 destDir 附加到 baseUrl 中
     * @type {boolean}
     */
    this.appendDestDirToBaseUrl = 'appendDestDirToBaseUrl' in opts ? opts.appendDestDirToBaseUrl : true;
  }

  /**
   * 根据服务器相关配置，获取文件在此服务器上的 url
   * @param {File} file
   * @returns {string}
   */

  _createClass(ServerEnv, [{
    key: 'getFileRemoteUrl',
    value: function getFileRemoteUrl(file) {
      var _file$remote = file.remote;
      var relative = _file$remote.relative;
      var basename = _file$remote.basename;

      var dir = this.appendDestDirToBaseUrl ? this.destDir : '';
      return _util2['default'].urlJoin(this.baseUrl, dir, relative, basename);
    }

    /**
     * 获取远程文件的目录
     * @param {File} file
     * @param {Boolean} absolute - 是否使用绝对路径
     * @returns {String}
     */
  }, {
    key: 'getFileRemoteDir',
    value: function getFileRemoteDir(file) {
      var absolute = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

      // @NOTE join('', '') => '.'
      var dir = _path2['default'].join(this.destDir, file.remote.relative);
      if (dir === '.') dir = '';
      dir = (0, _slash2['default'])(dir).replace(/\/$/, ''); // 统一转化成 / ，并去掉最后一个 /
      return dir.replace(/^\/?/, absolute ? '/' : '');
    }

    /**
     * 获取远程文件的路径
     * @param {File} file
     * @param {Boolean} absolute - 是否使用绝对路径
     * @returns {String}
     */
  }, {
    key: 'getFileRemotePath',
    value: function getFileRemotePath(file) {
      var absolute = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

      var dir = this.getFileRemoteDir(file, absolute);
      return dir + (dir === '' || dir === '/' ? '' : '/') + file.remote.basename;
    }
  }]);

  return ServerEnv;
})();

exports['default'] = ServerEnv;
module.exports = exports['default'];