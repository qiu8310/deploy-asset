/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

/* jshint -W100 */

'use strict';
var assert = require('assert'),
  util = require('util'),
  os = require('os');

var _ = require('lodash'),
  path = require('x-path'),
  log = require('npmlog'),
  glob = require('glob').sync,
  sprintf = require('sprintf-js').sprintf;

var File = require('./file'),
  Uploader = require('./uploader');

var daRcOpts = require('rc')('da');

// Add profiler level
log.addLevel('profiler', 3500, {fg: 'black', bg: 'cyan'}, 'TIME');
var _spy = log.profiler, marks = {};
log.profiler = function(mark, msg) {
  if (!marks[mark]) { marks[mark] = Date.now(); }
  _spy.call(log, sprintf('%s: %dms', mark, (Date.now() - marks[mark])), msg || '');
};

/*
 log.silly(prefix, message, ...)
 log.verbose(prefix, message, ...)
 log.info(prefix, message, ...)
 log.http(prefix, message, ...)
 log.warn(prefix, message, ...)
 log.error(prefix, message, ...)
 */

/**
 * 将字符串或数组统一成数组
 * @param {String|Array} arg
 * @private
 */
function _toArray(arg) {
  return arg ? [].concat(arg) : [];
}


/**
 * 用 glob 批量匹配
 * @param {Array|String} patterns
 * @param {Object} opts
 * @returns {Array}
 * @private
 */
function _batchGlob(patterns, opts) {
  return _toArray(patterns).reduce(function(all, curr) {
    return all.concat(glob(curr, opts));
  }, []);
}

/**
 * 得到所有需要处理的文件
 * @private
 * @param {String|Array} globPatterns
 * @param {Object} opts
 * @returns {Array}
 */
function _getInspectFiles(globPatterns, opts) {
  // 通过 globPatterns 得到所有需要处理的文件
  var inspectFiles;
  if (!globPatterns.length) {
    var ext = opts.htmlExts.length > 1 ? '{' + opts.htmlExts.join(',') + '}' : opts.htmlExts[0];

    if (_.isNumber(opts.deep) && opts.deep > 0) {
      var i, gs = [], stack = [];
      for (i = 0; i <= opts.deep; i++) {
        stack.push('*');
        gs.push(stack.join('/'));
      }
      globPatterns = '{' + gs.join(',') + '}' + '.' + ext;
    } else {
      globPatterns = (opts.deep ? '**/*.' : '*.') + ext;
    }
  }
  log.verbose('All files glob patterns', globPatterns);
  inspectFiles = _batchGlob(globPatterns, opts.glob);
  log.verbose('All files', inspectFiles);

  // 排除 excludes 指定的文件
  var excludes = [];
  if (opts.excludes.length) {
    excludes = _batchGlob(opts.excludes, opts.glob);
    inspectFiles = _.difference(inspectFiles, excludes);
  }
  log.verbose('Excluded files', excludes);

  return inspectFiles;
}

/**
 * 检查配置项
 * @param {Object} opts
 * @private
 */
function _checkOpts(opts) {

  // 确保 `dir` 存在，并且是一个目录
  assert(path.isDirectorySync(opts.dir), util.format('%s should be a directory', opts.dir));
  log.info('Root directory', opts.dir);

  // 对配置项的处理
  if (opts.outDir) {
    opts.outDir = path.relative(opts.dir, opts.outDir);
  }

  ['html', 'js', 'css', 'json'].forEach(function(key) {
    key += 'Exts';
    opts[key] = opts[key] && opts[key].trim().split(/\s*,\s*/) || [];
    assert(opts[key].length >= 1, util.format('opts.%s should at least contains one extension', key));
  });

  if (_.isNumber(opts.deep)) {
    opts.deep = parseInt(opts.deep, 10);
    assert(opts.deep >= 0, 'opts.deep should larger or equal than 0 or should be Boolean value,');
  }
  if (_.isNumber(opts.rename)) {
    opts.rename = parseInt(opts.rename, 10);
    assert(opts.rename >= -1, 'opts.rename should larger or equal than -1 or should be a Function.');
  }

  opts.excludes = _toArray(opts.excludes);
  if (opts.outDir && opts.outDir.indexOf('..') !== 0) {
    opts.excludes.push(path.join(opts.outDir, '**')); // 输出文件夹应该排除在外
  }

  opts.unbrokenFiles = _batchGlob(opts.unbrokenFiles, opts.glob);
  opts.unuploadFiles = _batchGlob(opts.unuploadFiles, opts.glob);
  opts.useAbsoluteRefFiles = _batchGlob(opts.useAbsoluteRefFiles, opts.glob);

  // 确保 uploader 配置
  var uploader = opts.uploader;
  var uploaderOptions = opts.uploaders[uploader] || opts.uploaderOptions;
  uploader = uploaderOptions.alias || uploader;
  opts.uploader = uploader;
  opts.uploaderOptions = uploaderOptions;

  opts.uploaderOptions.flat = opts.flat;
  if (typeof opts.destDir === 'string') opts.uploaderOptions.destDir = opts.destDir;
}

/**
 * 自动注册 Uploader
 * @private
 */
function _autoRegisterUploader(key) {
  try {
    Uploader.register(key, require(path.join(__dirname, 'uploaders', key)));
  } catch (e) {}
}


/**
 *
 * 修改文件 basename，返回一个新的 basename
 *
 * 如果返回的不是一个字段串，则会使用默认的 basename，而不是此函数返回的
 *
 * @callback RenameFunction
 * @param {String} oldBaseName      - 文件 basename
 * @param {String} relativePath     - 文件相对于当前目录的路径
 * @param {String} fileContent      - 文件内容
 * @returns {String} newBaseName - 返回新的 basename
 *
 * @global
 * @see da.opts.rename
 */

/**
 * @callback UploaderCallback
 * @param {Error} err - 上传失败的错误
 * @param {*} returns - 上传成功后返回的信息
 *
 * @global
 * @see QiniuUploader.uploadFile
 */


/**
 * deploy-asset（简称 da）
 *
 * 分析 `dir` 下的所有 html 文件，查找到所有关联的静态文件（如 js, css, font, image 等），
 * 将所有这些文件上传到指定的服务器上.
 *
 * 如果指定了 `globPatterns` 参数，则只会分析 `dir` 下 `globPatterns` 所指定的文件（ globPatterns 不会匹配文件夹 ）：
 *
 *  - 如果`globPatterns` 匹配到 html, css, js，则分析并上传
 *  - 如果`globPatterns` 匹配到其它无法分析的文件，如 mp3, mp4, font 等，则直接上传它们
 *
 * @global
 * @type {Function}
 * @param {String}    [dir = '.']       - 文件夹路径，只会分析所有 dir 内的文件，如果出现文件在 dir 目录外（远程文件不算），会报错
 * @param {String|Array} [globPatterns = null]  - {@link https://github.com/isaacs/node-glob glob} 字符串，
 *                                                指定要分析的文件或文件夹，而不是分析整个 `dir` 目录
 *
 * @param {Object}    [opts = {}]       - 配置项，支持在项目目录或个人目录下使用 `.darc` 的 json 文件
 *                                        保存配置，使用了 {@link https://github.com/dominictarr/rc rc} 来解析
 *
 * @param {String}    [opts.uploader = 'qiniu']         - 指定上传组件，默认且只支持 `qiniu`，但你可以注册自己的上传组件
 *                    {@link https://github.com/qiu8310/deploy-asset/blob/master/examples/custom-uploader.js 参考这里}
 * @param {Object}    [opts.uploaderOptions]            - 上传模块需要的配置，透传给指定的 uploader，参考 {@link QiniuUploader}
 * @param {Integer}   [opts.eachUploadLimit]            - 每次同步上传的个数限制，默认是 cpu 个数的两倍
 *
 * @param {Array}     [opts.includes = []]              - 这里指定的文件会合并到 `globPatterns` 中，
 *                                                        支持使用 {@link https://github.com/isaacs/node-glob glob}
 * @param {Array}     [opts.excludes = []]              - 这里指定的文件会从 `globPatterns` 中排除
 * @param {Array}     [opts.useAbsoluteRefFiles = []]   - 这里指定的文件中的内容所含资源会使用绝对路径，否则 HTML 和 CSS 中会优先使用相对路径，
 *                                                        支持使用 {@link https://github.com/isaacs/node-glob glob}
 * @param {Array}     [opts.unbrokenFiles = []]         - 这里指定的文件的内容不会更新
 *                                                        支持使用 {@link https://github.com/isaacs/node-glob glob}
 * @param {Array}     [opts.unuploadFiles = []]         - 这里指定的文件会被计算到，但不会上传到远程，注意，源文件是永远不会被更新的，
 *                                                        所以如果你想看此配置中的结果，通过指定 outDir 来查看。
 *                                                        支持使用 {@link https://github.com/isaacs/node-glob glob}
 * @param {String|Boolean}  [opts.outDir = false]        - 输出分析后的文件到此文件夹，如果设置为 false 则不会输出生成的文件
 * @param {String}          [opts.prefix = '']           - 输出的新的文件名的前缀
 * @param {String}          [opts.suffix = '']           - 输出的新的文件名的后缀
 * @param {String}          [opts.logLevel = 'warn']     - 打印的日志级别，
 *                                                         可以为 silly, verbose, profiler, info, warn, error, silent
 *
 *
 * @param {Integer|Boolean}         [opts.deep = false] - 指定要遍历文件夹的深度（ globPatterns 需要为 null ）
 *                                                        true: 递归，false|0: 当前文件夹，其它数字表示指定的深度
 * @param {Integer|RenameFunction}  [opts.rename = -1]   - 重命名文件的 basename
 *
 *  - 如果是 0 ，会忽略文件的名称，完全使用 hash 字符串，如 770b95bb61d5b0406c135b6e42260580.js
 *  - 如果是 -1，则不会添加任何 hash 字符串
 *  - 如果是 Integer，会加上 `rename` 个 hash 字符在 basename 后面，如 rename = 4, base.js => base-23ab.js
 *  - 如果是 Function，则会调用此 function 来返回新的 basename
 *
 * @param {Boolean}   [opts.flat = false]               - 是否将静态资源扁平化处理，七牛总是会扁平化处理
 * @param {String}    [opts.destDir = null]             - 要将静态资源发布到的远程目录，七牛不支持此选项
 *
 * @param {String}    [opts.htmlExts = 'html,htm']      - 指定 html 文件可能的后缀名
 * @param {String}    [opts.jsExts = 'js']              - 指定 js 文件可能的后缀名
 * @param {String}    [opts.cssExts = 'css']            - 指定 css 文件可能的后缀名
 * @param {String}    [opts.jsonExts = 'json']          - 指定 json 文件可能的后缀名
 * @param {Boolean}   [opts.force = false]              - 如果静态资源没找到，是否强制继续执行
 * @param {Boolean}   [opts.dry = false]                - 只显示执行结果，不真实上传文件
 *
 * @param {Function}  [callback = null]    - 文件上传完成后的回调函数，callback 的参数是一个所有文件组成的 Object
 *
 * @example <caption>分析当前文件夹及其子文件夹的所有 html 文件，并上传所有关联的静态文件</caption>
 * da('.');
 *
 * @example <caption>只分析当前文件夹，不分析其子文件夹的 html 文件，同时上传所有关联的静态文件</caption>
 * da('.', {deep: false});
 *
 * @example <caption>上传 image 目录下的 .png 文件</caption>
 * da('./image', '*.png');
 */
function da(dir, globPatterns, opts, callback) {
  globPatterns = opts = callback = null;
  [].slice.call(arguments, 1).forEach(function(arg) {
    if (_.isString(arg) || _.isArray(arg)) {
      globPatterns = arg;
    } else if (_.isPlainObject(arg)) {
      opts = arg;
    } else if (_.isFunction(arg)) {
      callback = arg;
    } else if (arg) {
      throw new Error('Arguments error.');
    }
  });

  // 获取 rc 文件中的 uploader 的 options 的配置
  var _uploader = opts && opts.uploader || daRcOpts.uploader;
  var _uploaderOptions = _uploader && daRcOpts.uploaders ? daRcOpts.uploaders[_uploader] : null;
  var uploaderDaRcOptions = _uploaderOptions && _uploaderOptions.options || {};


  // 默认配置项
  opts = _.assign({
    deep: false,

    includes: [],
    excludes: [],
    useAbsoluteRefFiles: [],
    unbrokenFiles: [],
    unuploadFiles: [],

    flat: false,
    destDir: null,
    force: false,
    dry: false,
    eachUploadLimit: (os.cpus().length || 1) * 2,
    uploader: 'qiniu',
    uploaderOptions: {},
    uploaders: {},
    htmlExts: 'html,htm',
    jsExts: 'js',
    cssExts: 'css',
    jsonExts: 'json',
    outDir: false,
    rename: -1,
    logLevel: 'warn',
    suffix: '',
    prefix: ''
  }, daRcOpts, uploaderDaRcOptions, opts);

  log.level = opts.logLevel;

  log.profiler('da', 'all start');
  log.info('Using config files: ', daRcOpts.configs);

  log.info('Argument dir', dir);
  log.info('Argument globPatterns', globPatterns);
  log.info('Resolved argument options', opts);

  // 得到目录绝对路径，并且统一 sep 为 '/'
  var cwd = path.normalizePathSeparate(process.cwd(), '/');
  dir = path.normalizePathSeparate(path.resolve(process.cwd(), dir), '/');

  opts.dir = dir;
  opts.cwd = cwd;
  opts.glob = { cwd: dir, root: dir, nodir: true };
  delete opts.type; // 不能用用户配置的 type 属性

  // 目录切换
  var back = function() { if (cwd !== dir) { process.chdir(cwd); } };
  if (cwd !== dir) {
    log.warn('Temporary change current dir to', dir);
    process.chdir(dir);
  }

  globPatterns = _toArray(globPatterns).concat(_toArray(opts.includes));

  // 检查配置
  _checkOpts(opts);

  // 根据配置得到所有需要处理的文件
  var inspectFiles = _getInspectFiles(globPatterns, opts);

  var done = function(err, all) {
    log.profiler('da', 'all ended');
    if (err) {
      back();
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
    } else {
      if (all) {
        log.info('All resolved files', _.map(all, function(f) { return f.path + ' => ' + f.remote.path; }));
      }

      if (callback) {
        callback(null, all || {});
      }
      back();
    }
  };

  if (!inspectFiles.length) {
    log.warn('No files to inspect');
    done();
  } else {

    log.info('Register uploader', inspectFiles);

    _autoRegisterUploader(opts.uploader);

    log.info('Inspect files', inspectFiles);
    File.inspect(inspectFiles, opts, done);
  }
}


da.Uploader = Uploader;

module.exports = da;
