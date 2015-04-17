/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';

var assert = require('assert'),
  util = require('util'),
  os = require('os');

var _ = require('lodash'),
  path = require('x-path'),
  log = require('npmlog'),
  glob = require('glob').sync;

var File = require('./file'),
  Uploader = require('./uploader');


/*
 log.silly(prefix, message, ...)
 log.verbose(prefix, message, ...)
 log.info(prefix, message, ...)
 log.http(prefix, message, ...)
 log.warn(prefix, message, ...)
 log.error(prefix, message, ...)
 */

/**
 * 用 glob 批量匹配
 * @param {Array} patterns
 * @param {Object} opts
 * @returns {Array}
 * @private
 */
function _batchGlob(patterns, opts) {
  var result = [];
  if (patterns) {
    patterns = [].concat(patterns);
    result = patterns.reduce(function(all, curr) {
      return all.concat(glob(curr, opts));
    }, []);
  }
  return result;
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
  if (!globPatterns || globPatterns.length === 0) {
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
    assert(opts.rename > 0, 'opts.rename should larger than 0 or should be a Function.');
  }

  opts.excludes = opts.excludes ? [].concat(opts.excludes) : []; // 确保 opts.excludes 是个数组
  if (opts.outDir && opts.outDir.indexOf('..') !== 0) {
    opts.excludes.push(path.join(opts.outDir, '**')); // 输出文件夹应该排除在外
  }

  opts.unbrokenFiles = _batchGlob(opts.unbrokenFiles, opts.glob);
}

/**
 * 自动注册 Uploader
 * @private
 */
function _autoRegisterUploader() {
  glob(path.resolve(__dirname, 'uploaders') + '/*.js').forEach(function(f) {
    var key = path.basename(f).replace(/\.\w+$/, '');
    Uploader.register(key, require(f));
  });
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
 * @param {Object}    [opts = {}]             - 配置项
 *
 * @param {String}    [opts.htmlExts = 'html,htm']      - 指定 html 文件可能的后缀名
 * @param {String}    [opts.jsExts = 'js']              - 指定 js 文件可能的后缀名
 * @param {String}    [opts.cssExts = 'css']            - 指定 css 文件可能的后缀名
 * @param {String}    [opts.jsonExts = 'json']          - 指定 json 文件可能的后缀名
 * @param {Boolean}   [opts.force = false]              - 如果静态资源没找到，是否强制继续执行
 * @param {Boolean}   [opts.dry = false]                - 只显示执行结果，不真实上传文件
 * @param {String}    [opts.uploader = 'qiniu']         - 只显示执行结果，不真实上传文件
 * @param {Integer}   [opts.eachUploadLimit]            - 每次同步上传的个数限制，默认是 cpu 个数的两倍
 * @param {Object}    [opts.uploaderOptions]            - 上传模块需要的配置，透传给指定的 uploader，参考 {@link module:QiniuUploader}
 * @param {Array}     [opts.excludes = []]              - 需要忽略的文件，支持使用 {@link https://github.com/isaacs/node-glob glob}
 * @param {Array}     [opts.unbrokenFiles = []]         - 文件如果包含在这数组中，则此文件的内容不会变动，只会直接上传到远程。
 *                                                        支持使用 {@link https://github.com/isaacs/node-glob glob}
 *
 * @param {String|Boolean}  [opts.outDir = false]        - 输出分析后的文件到此文件夹，如果设置为 false 则不会输出生成的文件
 * @param {String}          [opts.prefix = '']           - 输出的新的文件名前缀
 * @param {String}          [opts.logLevel = 'warn']     - 打印的日志级别，可以为 silly, verbose, info, warn, error, silent
 * @param {Integer|Boolean}         [opts.deep = false]  - 指定要遍历文件夹的深度（ globPatterns 需要为 null ）
 *                                                        true: 递归，false|0: 当前文件夹，其它数字表示指定的深度
 *
 * @param {Integer|RenameFunction}  [opts.rename = 8]   - 重命名文件的 basename
 *
 *  - 如果是 Integer，并且大于 0，则会在 basename 后面加上 `rename` 个 hash 的长度；如 rename = 4，则 base.js 可能会命名成 base-23ab.js
 *  - 如果是 Function，则会调用此 function 来返回新的 basename
 *  - 如果以上都不满足，则使用默认值 `8`
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

  // 默认配置项
  opts = _.assign({
    deep: false,
    excludes: [],
    unbrokenFiles: [],
    force: false,
    dry: false,
    uploader: 'qiniu',
    eachUploadLimit: (os.cpus().length || 1) * 2,
    uploaderOptions: {},
    htmlExts: 'html,htm',
    jsExts: 'js',
    cssExts: 'css',
    jsonExts: 'json',
    outDir: './public',
    rename: 8,
    logLevel: 'warn',
    prefix: ''
  }, opts);

  log.level = opts.logLevel;
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
    log.warn('change current dir to', dir);
    process.chdir(dir);
  }

  // 检查配置
  _checkOpts(opts);

  // 根据配置得到所有需要处理的文件
  var inspectFiles = _getInspectFiles(globPatterns, opts);

  var done = function(err, all) {
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
    log.info('Inspect files', inspectFiles);

    _autoRegisterUploader();
    File.inspect(inspectFiles, opts, done);
  }
}


da.Uploader = Uploader;

module.exports = da;



//da('.', '{*.json,*/*.json,*.html,*/*.html,*/*/*.html}', {
//  deep: 3, excludes: '*/global.html', prefix: 'b-',
//  dry: true,
//  uploadOptions: {
//    ak: 'MojRHbkKO0KqF3WLj_boOvUtM-IUI28jAApDJcHt',
//    sk: 'F4kKZbKzuSJjYkAlQel8zgL5k28NnYb99uggj_tz',
//    bucket: 'liulishuo',
//    domain: '7narj5.com1.z0.glb.clouddn.com'
//  }
//});
