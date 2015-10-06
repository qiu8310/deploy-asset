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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _ylog = require('ylog');

var _ylog2 = _interopRequireDefault(_ylog);

var _xPath = require('x-path');

var _xPath2 = _interopRequireDefault(_xPath);

var _mime = require('mime');

var _mime2 = _interopRequireDefault(_mime);

var _slash = require('slash');

var _slash2 = _interopRequireDefault(_slash);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _alter = require('alter');

var _alter2 = _interopRequireDefault(_alter);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _FileType = require('./FileType');

var _FileType2 = _interopRequireDefault(_FileType);

var _patterns = require('./patterns');

var _patterns2 = _interopRequireDefault(_patterns);

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

/**
 * @typedef {Object} Asset
 * @prop {Number} start
 * @prop {Number} end
 * @prop {String} raw - 引用处
 * @prop {String} src - 被替换的字符串
 * @prop {String} target - 替换成的字符串
 * @prop {String} filePath
 * @prop {Pattern} pattern
 */

var File = (function () {

  /**
   * File 构造函数
   *
   * @param {String} filePath - 文件的路径
   * @param {String} rootDir - 此文件的根目录
   * @param {DAOpts} [opts = {}] - 配置项
   * @param {Asset} [asset = {}] - 传了此值，表示此文件是从别的文件中找到的，此参数作用不大，可以忽略
   *
   * @throws ENOENT 文件不存在时，会抛出异常
   */

  function File(filePath, rootDir) {
    var _this = this;

    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    var asset = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    _classCallCheck(this, File);

    filePath = _xPath2['default'].resolve(filePath);
    rootDir = _xPath2['default'].resolve(rootDir);

    var relativePath = _xPath2['default'].relative(rootDir, filePath);

    /**
     * 配置项
     * @type {DAOpts}
     */
    this.opts = opts;

    /**
     * 当前文件的绝对路径
     * @type {String}
     */
    this.filePath = filePath;
    /**
     * @alias File#filePath 主要是为了给 dep.js 用的
     */
    this.value = filePath;
    /**
     * @type {Array} 主要是为了给 dep.js 用的
     */
    this.depends = [];
    /**
     * @type {Array} 主要是为了给 dep.js 用的
     */
    this.deepDepends = null;

    /**
     * 当前文件的根目录
     * @type {String}
     */
    this.rootDir = rootDir;

    /**
     * 此文件相对根目录的路径
     * @type {String}
     */
    this.relativePath = relativePath;

    /**
     * 当前文件的 Buffer 内容
     * @type {Buffer}
     */
    this.content = _fsExtra2['default'].readFileSync(filePath);

    /**
     * 当前文件的 mime 文件类型
     * @type {String}
     */
    this.mimeType = _mime2['default'].lookup(filePath);

    /**
     * 当前文件目录
     * @type {String}
     */
    this.dirname = _xPath2['default'].dirname(filePath);

    /**
     * 当前文件名称
     * @type {String}
     */
    this.basename = _xPath2['default'].basename(filePath);

    /**
     * 此文件的目录相对根目录的路径
     * @NOTE 不能使用 path.dirname(relativePath)，这样的话会出现值为 "." 的情况
     * @type {String}
     */
    this.relativeDir = _xPath2['default'].relative(rootDir, this.dirname);

    /**
     * 当前文件后缀名，包含 '.'
     * @type {String}
     */
    this.extname = _xPath2['default'].extname(filePath);

    /**
     * 当前文件的后缀名，不包含 '.'
     * @type {String}
     */
    this.ext = this.extname.substr(1);

    /**
     * 文件的名称，不包括后缀
     * @type {string}
     */
    this.name = this.basename.slice(0, -this.extname.length);

    /**
     * 文件类型
     * @type {String}
     */
    this.type = asset.type && asset.type !== 'unknown' ? asset.type : _util2['default'].getFileType(filePath, opts);

    /**
     * 根据黑名单，白名单得到的一些配置项
     * @type {{inspect: boolean, upload: boolean, replace: boolean, rename: boolean, absolute: boolean}}
     */
    this.apply = {
      inspect: true, // 是否要执行 inspectAssets
      upload: true, // 是否要上传文件
      replace: true, // 是否要替换里面的静态资源
      rename: true, // 是否重命名
      absolute: true // 执行 replace 时，是否使用绝对路径来替换；只有在 replace 为 true 时才有效
    };

    _lodash2['default'].each(this.apply, function (val, key) {
      var whiteList = opts[key + 'Patterns'];
      var blackList = opts['no' + _lodash2['default'].capitalize(key) + 'Patterns'];
      _this.apply[key] = _util2['default'].applyWhiteAndBlackList([relativePath], whiteList, blackList).length;
    });

    /**
     * 所有引用了此文件的 Files
     * @type {Array<File>}
     */
    this.callers = [];

    /**
     * 所有此文件中包含的静态资源
     * @type {Array<Asset>}
     */
    this.assets = [];
    /**
     * 所有此文件中包含的静态资源所对应的文件
     * @type {Array<File>}
     */
    this.assetFiles = [];

    /**
     * 压缩相关的信息
     * @type {{originalSize: Number, minifiedSize: Number, diffSize: Number, rate: String}}
     */
    this.min = null;

    /**
     * 上传相关的状态
     * @type {{exists: null, conflict: null, uploaded: null, success: boolean}}
     */
    this.status = {
      exists: null, // 是否远程文件已经存在了
      conflict: null, // 是否和远程文件不一致
      uploaded: null, // 是否上传到远程了
      success: false // 是否远程文件生效了，上传成功，或没上传，但远程文件和本地文件一样，此值都为 true
    };
    /**
     * 远程文件相关的信息
     * @type {{basename: string, content: buffer, relative: string, url: string}}
     */
    this.remote = {
      basename: null,
      content: this.content,
      relative: opts.flat ? '' : this.relativeDir,
      url: null
    };

    /**
     * @alias File#filePath
     * @deprecated 以后可能被废弃，请使用 File#filePath 替代
     */
    this.path = filePath;

    // 添加到引用中
    File.refs[filePath] = this;
  }

  /*
   一此常量，标识文件的类型
   */

  /**
   * 文件是否应该保存到本地
   *
   * 条件是：此文件不要上传，但它包含有要上传的静态资源，并且要执行替换资源操作
   *
   * @returns {boolean}
   */

  _createClass(File, [{
    key: 'shouldSave',
    value: function shouldSave() {
      return !this.apply.upload && this.apply.replace && this.assets.length && this.assets.some(function (f) {
        return File.findFileInRefs(f.filePath).apply.upload;
      });
    }

    /**
     * 根据文件路径，找到对应的文件
     * @param {String} filePath
     * @returns {File|Undefined}
     */
  }, {
    key: 'updateRemoteBasename',

    /**
     * 根据配置，得到远程文件的 basename
     */
    value: function updateRemoteBasename() {
      if (this.remote.basename) return this.remote.basename;
      if (!this.apply.rename) {
        this.remote.basename = this.basename;
        return this.basename;
      }

      var opts = this.opts;
      var hash = parseInt(opts.hash, 10);
      if (hash && hash > 0) {
        var md5 = _crypto2['default'].createHash('md5');
        var hashPrefix = 'hashPrefix' in opts ? opts.hashPrefix : opts.DEFAULTS.HASH_PREFIX;
        md5.update(opts.hashSource === 'remote' ? this.remoteContentString : this.contentString);
        hash = hashPrefix + md5.digest('hex').substr(0, hash);
      } else {
        hash = '';
      }

      var map = {
        name: this.name,
        prefix: opts.prefix || '',
        suffix: opts.suffix || '',
        hash: hash
      };
      var keys = Object.keys(map);
      var rename = opts.rename || opts.DEFAULTS.RENAME;
      var name = undefined;
      if (typeof rename === 'function') {
        name = rename(this, map);
      } else {
        name = rename.replace(/\{(\w+)\}/g, function (raw, k) {
          k = _lodash2['default'].find(keys, function (key) {
            return key.indexOf(k) === 0;
          });
          return k ? map[k] : raw;
        });
      }

      this.remote.basename = name + this.extname;
      return this.remote.basename;
    }

    /**
     * 更新远程文件的链接
     * 依赖于 updateRemoteBaseName，及 opts.env
     */
  }, {
    key: 'updateRemoteUrl',
    value: function updateRemoteUrl() {
      var remote = this.remote;
      if (remote.url) return remote.url;
      remote.url = this.opts.env.getFileRemoteUrl(this);
      return remote.url;
    }

    /**
     * 同时更新 remote.basename 和 remote.url
     */
  }, {
    key: 'updateRemote',
    value: function updateRemote() {
      this.updateRemoteBasename();
      this.updateRemoteUrl();
    }

    /**
     * 添加调用此文件的父文件
     * @param {File} file
     */
  }, {
    key: 'addCaller',
    value: function addCaller(file) {
      if (this.callers.indexOf(file) < 0) this.callers.push(file);
    }

    /**
     * 遍历此文件内容，找到此文件所包含的其它静态资源文件
     *
     * @param {Function} [filter]
     * @NOTE inspect 被 node 的 console 使用了，所以起了此名字
     */
  }, {
    key: 'insp',
    value: function insp(filter) {
      var _this2 = this;

      var patterns = _patterns2['default'][this.type];
      var assets = [];

      if (!this.apply.inspect) _ylog2['default'].verbose('*此文件指定为忽略检查*');else if (this.type === File.STATIC_TYPE) _ylog2['default'].verbose('*此文件类型不支持检查*');else if (!patterns || !patterns.length) _ylog2['default'].verbose('*此文件类型没有对应的匹配规则*');else {
        (function () {
          var relativeDirs = [_this2.dirname];
          // 如果是 JS 或 JSON 文件，则相对路径是调用它文件的目录，CSS 和 HTML 文件中的资源都是相对于此文件本身的
          if ([File.JSON_TYPE, File.JS_TYPE].indexOf(_this2.type) >= 0) _this2.callers.forEach(function (file) {
            if (relativeDirs.indexOf(file.dirname) < 0) relativeDirs.push(file.dirname);
          });

          assets = patterns.reduce(function (all, pattern) {
            return all.concat(_this2._inspectAssetsUsePattern(pattern, relativeDirs));
          }, []);

          if (typeof filter === 'function') {
            _ylog2['default'].info('执行 ~inspectCallback~ ...');
            assets = filter(_this2, assets);
          }
        })();
      }

      this.assets = assets;
      return assets;
    }

    /**
     * 根据此文件的 assets，创建对应的 files
     */
  }, {
    key: 'resolveAssets',
    value: function resolveAssets() {
      var _this3 = this;

      this.assetFiles = this.assets.map(function (asset) {
        var file = File.findFileInRefs(asset.filePath);
        if (!file) file = new File(asset.filePath, _this3.opts.rootDir, _this3.opts, asset);
        file.addCaller(_this3);
        return file;
      });
      return this.assetFiles;
    }
  }, {
    key: '_inspectAssetsUsePattern',
    value: function _inspectAssetsUsePattern(pattern, relativeDirs) {
      var _this4 = this;

      var result = [];
      _ylog2['default'].silly(pattern.msg + '： **%s**', pattern.re);
      this.remoteContentString.replace(pattern.re, function (raw, src, index) {

        _ylog2['default'].silly(' 找到 *%s*', src);

        // 如果是以 \w+: 或 // 开头的文件 ，则忽略，如 http://xxx.com/jq.js, //xxx.com/jq.js, javascript:;
        if (/^(?:\w+:|\/\/)/.test(src)) return raw;

        // 去掉 src 中的 ? 及 # 之后的字符串
        src = src.replace(/[\?|#].*$/, '').trim();

        // 如果剩下的是个空字符串，当然也去掉
        if (!src) return raw;

        // 如果是绝对路径，需要把当前路径放到相对路径中去
        if (src[0] === '/' && relativeDirs.indexOf(_this4.rootDir) < 0) relativeDirs.unshift(_this4.rootDir);

        // 用指定的函数过滤下
        var start = index + raw.indexOf(src);
        var end = start + src.length;
        var assetPath = undefined;

        var assetRelative = pattern.inFilter ? pattern.inFilter(src) : src;

        // 从 relativeDirs 中查找 assetPath
        relativeDirs.some(function (dir) {
          var tmpFilePath = _xPath2['default'].join(dir, assetRelative);
          if (_xPath2['default'].isFileSync(tmpFilePath)) {
            assetPath = tmpFilePath;
            return true;
          }
        });

        if (pattern.exists && !assetPath) {
          var force = _this4.opts.ignoreNoneAssetError;
          var level = force ? 'warn' : 'error';
          _ylog2['default'][level]('文件 ^%s^ 中的静态资源 ~%s~ 无法定位到', _this4.relativePath, assetRelative);

          if (!force) {
            _ylog2['default'][level]('可以启用 ~ignoreNoneAssetError~ 来忽略此错误');
            throw new Error('NONE_ASSET');
          }
        }

        if (assetPath) {
          assetPath = _xPath2['default'].relative(_this4.rootDir, assetPath);
          _ylog2['default'].silly('  => *%s*', assetPath);
          var asset = { pattern: pattern, start: start, end: end, raw: raw, src: src, target: null, filePath: _xPath2['default'].resolve(assetPath) };
          result.push(asset);
        }
      });

      return result;
    }

    /**
     * 执行静态资源替换
     *
     * @NOTE 文件所依赖的 assets 需要先获取它们的 remote.url 和 remote.basename
     */
  }, {
    key: 'replace',
    value: function replace() {
      var _this5 = this;

      var result = [];
      if (!this.apply.replace) _ylog2['default'].verbose('*此文件指定为忽略替换*');else if (this.type === File.STATIC_TYPE) _ylog2['default'].verbose('*此文件类型不支持替换*');else if (!this.assets.length) _ylog2['default'].verbose('*此文件没有依赖其它静态资源*');else {
        this.remote.content = new Buffer((0, _alter2['default'])(this.remoteContentString, this.assets.map(function (asset) {

          var assetFilePath = asset.filePath;
          var assetRemote = File.findFileInRefs(assetFilePath).remote;
          var assetUrl = undefined;

          // 这里需要依赖于 asset 的 url 和 basename
          if (_this5.apply.absolute) {
            assetUrl = assetRemote.url;
          } else {
            assetUrl = (0, _slash2['default'])(_xPath2['default'].relative(_this5.remote.relative, _xPath2['default'].join(assetRemote.relative, assetRemote.basename)));
          }

          if (asset.pattern.outFilter) assetUrl = asset.pattern.outFilter(assetUrl);

          asset.target = assetUrl;
          result.push(asset);
          return { start: asset.start, end: asset.end, str: assetUrl };
        })));
      }

      return result;
    }

    /**
     * 上传文件
     * @private
     * @param {Function} done
     */
  }, {
    key: 'upload',
    value: function upload(done) {
      var _this6 = this;

      var fileStr = this.relativePath;
      if (!this.apply.upload) {
        _ylog2['default'].info.title('忽略上传文件 ^%s^', fileStr);
        done();
      } else {
        (function () {
          _ylog2['default'].info.title('开始上传文件 ^%s^', fileStr);

          var end = function end(err) {
            if (_this6.status.success) _ylog2['default'].info.writeOk('上传文件 ^%s^ => ^%s^ 成功', fileStr, _this6.remote.url);
            done(err);
          };

          _this6._beforeUpload(function (err) {
            if (err) return end(err);
            _this6._upload(function (err) {
              if (err) return end(err);
              _this6._afterUpload(end);
            });
          });
        })();
      }
    }
  }, {
    key: '_judgeExists',
    value: function _judgeExists(uploader, error, success, isDiff) {
      var _this7 = this;

      uploader.isRemoteFileExists(this, function (err, exists) {
        if (err) return error(err);

        _this7.status.exists = exists;

        if (exists) {
          if (isDiff) return success();

          var ignore = _this7.opts.ignoreExistsError;
          var level = ignore ? 'warn' : 'error';
          _ylog2['default'][level].writeError('文件 ^%s^ 上传失败，远程文件 ^%s^ 已经存在', _this7.relativePath, _this7.remote.url);

          if (!ignore) _ylog2['default'][level]('你可以启用 ~ignoreExistsError~ 来忽略此错误，但不会继续上传文件').ln.log('  或者启用 ~overwrite~ 来强制覆盖远程文件').ln.log('  或者启用 ~diff~ 来和远程文件比对，如果一致则无需上传');

          error(ignore ? null : new Error('REMOTE_FILE_EXISTS'));
        } else {
          if (isDiff) return error();

          success();
        }
      });
    }
  }, {
    key: '_judgeConflict',
    value: function _judgeConflict(uploader, error, success) {
      var _this8 = this;

      uploader.getRemoteFileContent(this, function (err, content) {
        if (err) return error(err);

        _this8.status.conflict = _this8.remote.content.compare(content) !== 0;

        if (_this8.status.conflict) {
          var ignore = _this8.opts.ignoreConflictError;
          var level = ignore ? 'warn' : 'error';
          _ylog2['default'][level].writeError('文件 ^%s^ 上传失败，它和远程文件 ^%s^ 的内容不一致（注意：在浏览器上看到的结果可能并不是最新的）', _this8.relativePath, _this8.remote.url);

          if (!ignore) _ylog2['default'][level]('你可以启用 ~ignoreConflictError~ 来忽略此错误，但不继续上传文件').ln.log('  或者关闭 ~diff~ 来忽略和远程文件的对比');

          error(ignore ? null : new Error('REMOTE_FILE_CONFLICT'));
        } else {
          success();
        }
      });
    }
  }, {
    key: '_judgeUploaded',
    value: function _judgeUploaded(uploader, error, success) {
      var _this9 = this;

      if (this.opts.dry) {
        this.status.success = true;
        return success();
      }

      uploader.uploadFile(this, function (err) {
        _this9.status.uploaded = !err;
        var ignore = _this9.opts.ignoreUploadError;
        var level = ignore ? 'warn' : 'error';
        if (err) {
          _ylog2['default'][level].writeError('上传文件 ^%s^ => ^%s^ 失败', _this9.relativePath, _this9.remote.url);
          if (!ignore) _ylog2['default'][level]('你可以启用 ~ignoreUploadError~ 来忽略此错误');

          _util2['default'].error(err, level, _this9.opts.stack);
          error(ignore ? null : new Error('UPLOAD_ERROR'));
        } else {
          _this9.status.success = true;
          success();
        }
      });
    }
  }, {
    key: '_upload',
    value: function _upload(callback) {
      var _this10 = this;

      var _opts = this.opts;
      var uploader = _opts.uploader;
      var ignoreUploadError = _opts.ignoreUploadError;
      var ignoreExistsError = _opts.ignoreExistsError;
      var ignoreDiffError = _opts.ignoreDiffError;
      var overwrite = _opts.overwrite;
      var diff = _opts.diff;

      if (!overwrite && !diff) {
        this._judgeExists(uploader, callback, function () {
          _this10._judgeUploaded(uploader, callback, callback);
        });
      } else if (overwrite) {
        this._judgeUploaded(uploader, callback, callback);
      } else if (diff) {
        this._judgeExists(uploader, callback, function () {
          _this10._judgeConflict(uploader, callback, function () {
            _this10.status.success = true; // 文件一样，就不需要上传了
            callback();
          });
        }, diff);
      } else {
        throw new Error('OVERWRITE_DIFF_CONFLICT');
      }
    }
  }, {
    key: '_beforeUpload',
    value: function _beforeUpload(callback) {
      this.opts.uploader.beforeUploadFile(this, callback);
    }
  }, {
    key: '_afterUpload',
    value: function _afterUpload(callback) {
      this.opts.uploader.afterUploadFile(this, callback);
    }
  }, {
    key: 'contentString',

    /**
     * @returns {string} 当前文件内容的字符串
     */
    get: function get() {
      return this.content.toString();
    }

    /**
     * @returns {string} 将要上传到服务器上的文件内容的字符串
     */
  }, {
    key: 'remoteContentString',
    get: function get() {
      return this.remote.content.toString();
    }
  }], [{
    key: 'findFileInRefs',
    value: function findFileInRefs(filePath) {
      return File.refs[_xPath2['default'].resolve(filePath)];
    }
  }]);

  return File;
})();

exports['default'] = File;
File.STATIC_TYPE = _FileType2['default'].STATIC.value;
File.HTML_TYPE = _FileType2['default'].HTML.value;
File.JSON_TYPE = _FileType2['default'].JSON.value;
File.CSS_TYPE = _FileType2['default'].CSS.value;
File.JS_TYPE = _FileType2['default'].JS.value;

/*
 所有文件的引用都放在这里
 */
File.refs = {};
module.exports = exports['default'];