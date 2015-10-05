'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _xPath = require('x-path');

var _xPath2 = _interopRequireDefault(_xPath);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _ylog = require('ylog');

var _ylog2 = _interopRequireDefault(_ylog);

var _util = require('../util');

var _util2 = _interopRequireDefault(_util);

var _ServerEnv = require('../ServerEnv');

var _ServerEnv2 = _interopRequireDefault(_ServerEnv);

var _uploadersUploader = require('../uploaders/Uploader');

var _uploadersUploader2 = _interopRequireDefault(_uploadersUploader);

function _initUploader(opts, DEFAULTS) {

  var uploader = opts.uploader,
      uploaderOpts = undefined,
      uploaderName = undefined;

  if (uploader instanceof _uploadersUploader2['default']) {
    uploaderName = uploader.name;
    uploaderOpts = uploader.opts;
  } else {
    uploaderName = opts.uploaderName || DEFAULTS.UPLOADER_NAME;
    uploaderOpts = opts.uploaderOpts || {};
  }

  opts.uploaderName = uploaderName;
  opts.uploaderOpts = uploaderOpts;
}

function _createUploader(opts, DEFAULTS) {
  var uploader = opts.uploader;
  if (DEFAULTS.APPLY_STEP.upload) {
    if (!(uploader instanceof _uploadersUploader2['default'])) uploader = _uploadersUploader2['default'].instance(opts.uploaderName, opts.uploaderOpts, opts.env);

    opts.uploader = uploader;
    _configOptsAccordingUploader(opts, uploader);
  }
}

function _configOptsAccordingUploader(opts, uploader) {
  if (uploader.mustFlatAssets && !opts.flat) {
    _ylog2['default'].warn(opts.uploaderName + '上传器需要扁平化静态资源，所以自动设置 ~opts.flat = true~ ');
    opts.flat = true;
  }

  var max = uploader.maxConcurrentJobs;
  if (max > 0 && max < opts.concurrence) {
    _ylog2['default'].warn(opts.uploaderName + '上传器最大允许的同步任务数是 !' + max + '! ，所以自动设置 ~opts.concurrence = ' + max + '~ ');
    opts.concurrence = max;
  }

  if (uploader.retrieveRemoteUrlAfterUploaded && opts.concurrence !== 1) {
    _ylog2['default'].warn(opts.uploaderName + '上传器需要在文件上传完后才能返回文件链接，' + ('所以无法异步上传，自动设置 ~opts.concurrence = ' + max + '~ '));
    opts.concurrence = 1;
  }
}

function _filterOutOpts(opts) {
  var rtn = {},
      rejects = ['DEFAULTS', 'uploader'];
  Object.keys(opts).forEach(function (k) {
    if (rejects.indexOf(k) < 0) rtn[k] = opts[k];
  });
  return rtn;
}

/**
 * 对 da 传过来的参数被始化
 * @param {String|Array} any
 * @param {DAOpts} opts
 * @param {function} next
 */

exports['default'] = function (any, opts, next) {

  try {
    var _ret = (function () {

      _util2['default'].banner('初始化');

      var DEFAULTS = opts.DEFAULTS;

      _initUploader(opts, DEFAULTS);

      _ylog2['default'].setLevel(opts.logLevel);
      _ylog2['default'].info('选项', _filterOutOpts(opts)).ln();

      if (opts.overwrite && opts.diff) return {
          v: next(new Error('OVERWRITE_AND_DIFF_CONFLICT'))
        };

      // 遍历当前文件夹，找到所有文件
      var filePaths = _parseDaAnyArgument(any.length ? any : opts.rootDir);
      if (filePaths.length === 0) return {
          v: next(new Error('NO_FILES'))
        };

      // 获取根目录
      var rootDir = opts.rootDir;
      if (!rootDir) rootDir = typeof any === 'string' && _xPath2['default'].isDirectorySync(any) ? any : _util2['default'].getFilesCommonDirectory(filePaths);

      rootDir = _xPath2['default'].resolve(rootDir);
      opts.rootDir = rootDir; // 保证 rootDir 是绝对路径

      // 将文件转化成相对 rootDir 的路径
      filePaths = filePaths.map(function (filePath) {
        return _xPath2['default'].relative(rootDir, _xPath2['default'].resolve(filePath));
      });

      _ylog2['default'].info('根目录: ^%s^', rootDir).ln();
      process.chdir(rootDir);

      // 保证所有文件都在根目录内
      var notAllInRoot = filePaths.some(function (filePath) {
        if (filePath.substr(0, 2) === '..') {
          _ylog2['default'].error('文件 ^%s^ 不在根目录内', _xPath2['default'].resolve(filePath));
          return true;
        }
      });
      if (notAllInRoot) return {
          v: next(new Error('FILE_NOT_IN_ROOT_DIR'))
        };

      // 根据黑白名单过滤 filePaths
      _ylog2['default'].verbose('根据 any 参数找到文件 *%o*', filePaths);
      filePaths = _util2['default'].applyWhiteAndBlackList(filePaths, opts.includePatterns, opts.noIncludePatterns);
      _ylog2['default'].verbose('include 和 noInclude 过滤后的文件 *%o*', filePaths);

      if (!filePaths.length) return {
          v: next(new Error('NO_FILE_AFTER_FILTER'))
        };

      opts.env = new _ServerEnv2['default'](opts);
      _createUploader(opts, DEFAULTS);

      next(null, filePaths, opts);
    })();

    if (typeof _ret === 'object') return _ret.v;
  } catch (e) {
    next(e);
  }
};

/**
 * 解析 da 的第一个参数
 * @private
 * @param {String|Array} any
 * @returns {Array<String>}
 * @throws ANY_ARGUMENT_ERROR
 */
function _parseDaAnyArgument(any) {
  var filePaths = [];

  if (Array.isArray(any)) {
    any.forEach(function (a) {
      return filePaths.push.apply(filePaths, _toConsumableArray(_parseDaAnyArgument(a)));
    });
  } else if (typeof any === 'string') {
    try {
      var stat = _fsExtra2['default'].statSync(any);
      if (stat.isFile()) {
        filePaths.push(any);
      } else if (stat.isDirectory()) {
        filePaths.push.apply(filePaths, _toConsumableArray(getAllFilesInDirectory(any)));
      }
    } catch (e) {
      filePaths.push.apply(filePaths, _toConsumableArray(_glob2['default'].sync(any, { nodir: true })));
    }
  } else {
    throw new Error('ANY_ARGUMENT_ERROR');
  }

  return filePaths;
}

/**
 * 得到文件夹下的所有文件，忽略以 . 开头的文件
 * @param {String} dir
 * @returns {Array}
 */
function getAllFilesInDirectory(dir) {
  var cwd = process.cwd();
  var result = [];
  _fsExtra2['default'].readdirSync(dir).forEach(function (filePath) {
    if (filePath[0] !== '.') {
      filePath = _xPath2['default'].join(dir, filePath);
      var stat = _fsExtra2['default'].statSync(filePath);
      if (stat.isFile()) {
        result.push(_xPath2['default'].relative(cwd, filePath));
      } else if (stat.isDirectory()) {
        result.push.apply(result, _toConsumableArray(getAllFilesInDirectory(filePath)));
      }
    }
  });
  return result;
}
module.exports = exports['default'];