'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _xPath = require('x-path');

var _xPath2 = _interopRequireDefault(_xPath);

var _ylog = require('ylog');

var _ylog2 = _interopRequireDefault(_ylog);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _FileType = require('./FileType');

var _FileType2 = _interopRequireDefault(_FileType);

/**
 * 得到文件（不包括文件夹）的公共目录
 * @param {Array<String>} filePaths - 所有文件路径，至少要有一个
 * @returns {String}
 */
function getFilesCommonDirectory(filePaths) {
  if (filePaths.length === 1) return _xPath2['default'].dirname(filePaths[0]);
  filePaths = filePaths.map(function (f) {
    return _xPath2['default'].resolve(f);
  });

  var refs = filePaths[0].split(/\\|\//);

  var dir = refs[0] || '/'; // 非 windows 下第一个值是 ''，将它转化成根目录

  var check = function check(dir) {
    return function (filePath) {
      return filePath.indexOf(dir) === 0 && ['/', '\\'].indexOf(filePath[dir.length]) >= 0;
    };
  };

  var matchOnce = false;

  for (var i = 1; i < refs.length; i++) {
    if (filePaths.every(check(_xPath2['default'].join(dir, refs[i])))) dir = _xPath2['default'].join(dir, refs[i]);else break;
    matchOnce = true;
  }

  // 在 windows 下可能文件在不同的磁盘上，这样就无法找到共同的目录了
  if (!matchOnce) throw new Error('NO_COMMON_DIRECTORY');

  return dir;
}

/**
 * 统一用户配置的 baseUrl 为带 http:// 前缀及后缀有 / 的一个 Url
 * @param {String} baseUrl
 * @returns {String}
 */
function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/^(\w+:\/\/)?(.*?)(\/)?$/, function (raw, prefix, mid, postfix) {
    return (prefix || 'http://') + mid + (postfix || '/');
  });
}

/**
 * 合并 baseUrl 和它的剩余的各个部分，支持直接填写文件路径，包括 window 的文件路径
 *
 * @param {String} baseUrl
 * @param {Array} parts
 * @returns {string}
 */
function urlJoin(baseUrl) {
  for (var _len = arguments.length, parts = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    parts[_key - 1] = arguments[_key];
  }

  parts = parts.map(function (part) {
    return part.replace(/\\/g, '/').replace(/^\/|\/$/g, '');
  }).filter(function (part) {
    return part && part.length;
  });

  return normalizeBaseUrl(baseUrl) + parts.join('/');
}

/**
 * 有些平台的 api 返回的错误并不是一个 js 的 Error 实例，这里把所有错误转化成一个 js 的 Error 实例
 * @param {*} err
 * @returns Error
 */
function normalizeError(err) {
  if (!err) {
    return err;
  }
  if (err && err instanceof Error) {
    return err;
  }

  return new Error(JSON.stringify(err));
}

exports['default'] = {

  banner: function banner(title) {
    _ylog2['default'].info.ln.ln.log('===============').title('**' + title + '**').log('===============').ln();
  },

  error: function error(err) {
    var level = arguments.length <= 1 || arguments[1] === undefined ? 'warn' : arguments[1];
    var stack = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    _ylog2['default'].color(level === 'warn' ? 'yellow' : 'red')[level](stack ? err : err.message);
  },

  urlJoin: urlJoin,
  normalizeError: normalizeError,
  normalizeBaseUrl: normalizeBaseUrl,
  getFilesCommonDirectory: getFilesCommonDirectory,

  /**
   * @param {Array} list
   * @param {Array|String} patterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  match: function match(list, patterns) {
    var mapFn = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    if (!Array.isArray(patterns)) patterns = [patterns];
    return list.filter(function (it) {
      return patterns.some(function (pattern) {
        return (0, _minimatch2['default'])(mapFn ? mapFn(it) : it, pattern);
      });
    });
  },

  /**
   * @param {Array} list
   * @param {Array|String|Boolean} patterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  applyWhitelist: function applyWhitelist(list, patterns) {
    var mapFn = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    if (patterns === false) return [];
    if (!patterns || patterns.length === 0 || patterns === true) return list;

    return _lodash2['default'].intersection(list, this.match(list, patterns, mapFn));
  },

  /**
   * @param {Array} list
   * @param {Array|String|Boolean} patterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  applyBlacklist: function applyBlacklist(list, patterns) {
    var mapFn = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    if (patterns === true) return [];
    if (!patterns || patterns.length === 0 || patterns === false) return list;

    return _lodash2['default'].difference(list, this.match(list, patterns, mapFn));
  },

  /**
   * @param {Array} list
   * @param {Array|String|Boolean} whitePatterns
   * @param {Array|String|Boolean} blackPatterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  applyWhiteAndBlackList: function applyWhiteAndBlackList(list, whitePatterns, blackPatterns) {
    var mapFn = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

    return this.applyBlacklist(this.applyWhitelist(list, whitePatterns, mapFn), blackPatterns, mapFn);
  },

  /**
   * 获取文件的类型
   * @param {String} filename
   * @param {Object} [opts = {}]
   * @param {Array} [opts.htmlExtensions] - 手动指定 html 文件的后缀名，默认使用 FileType.HTML.extensions
   * @param {Array} [opts.jsExtensions] - 手动指定 js 文件的后缀名，默认使用 FileType.JS.extensions
   * @param {Array} [opts.cssExtensions] - 手动指定 css 文件的后缀名，默认使用 FileType.CSS.extensions
   * @param {Array} [opts.jsonExtensions] - 手动指定 json 文件的后缀名，默认使用 FileType.JSON.extensions
   * @param {String} [defaultType = FileType.STATIC.value]
   * @returns {String}
   */
  getFileType: function getFileType(filename) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var defaultType = arguments.length <= 2 || arguments[2] === undefined ? _FileType2['default'].STATIC.value : arguments[2];

    var ext = filename.split('.').pop();
    var type = defaultType;
    var keys = _lodash2['default'].keys(_FileType2['default']);
    var has = function has(custom) {
      return keys.some(function (key) {
        var ft = _FileType2['default'][key];
        var extensions = custom ? opts[ft.value + 'Extensions'] : ft.extensions;
        if (extensions && extensions.indexOf(ext) >= 0) {
          type = ft.value;
          return true;
        }
      });
    };

    // 先用自定义的后缀来检查，再用默认的；不能同时检查
    if (!has(true)) has(false);

    return type;
  }
};
module.exports = exports['default'];