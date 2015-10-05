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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _stepsStepInit = require('./steps/step-init');

var _stepsStepInit2 = _interopRequireDefault(_stepsStepInit);

var _stepsStepInspect = require('./steps/step-inspect');

var _stepsStepInspect2 = _interopRequireDefault(_stepsStepInspect);

var _stepsStepReplace = require('./steps/step-replace');

var _stepsStepReplace2 = _interopRequireDefault(_stepsStepReplace);

var _stepsStepUpload = require('./steps/step-upload');

var _stepsStepUpload2 = _interopRequireDefault(_stepsStepUpload);

/**
 * @typedef {Object} DAOpts
 *
 * @NOTE 下面有很多 patterns 和 noPatterns 的配置，不带 no 的表示白名单，带 no 的表示黑名单
 *
 * 白名单黑名单的处理规则是：
 *
 *  - 先应用白名单（如果没有指定，则忽略）
 *    * 如果是 true，则返回所有文件
 *    * 如果是 false，则返回空数组
 *    * 如果是数组或字符串，则把“匹配了这里的任一一个名单”的项目过滤出来
 *  - 再应用黑名单（如果没有指定，则忽略）
 *    * 如果是 true，则返回空数组
 *    * 如果是 false，则返回所有文件
 *    * 如果是数组或字符串，则把“匹配了这里的任一一个名单”的项目排除出去
 *
 * @TODO 添加测试
 * @prop {Function} [inspectFilter] file.inspect 执行完后会执行此函数，参数是 (file, assets)，函数需要返回过滤后的 assets
 *
 * @prop {String} [rootDir] - 要上传文件的根目录，可以不指定，不指定的话会自动根据 any 来判断
 *
 * @prop {Uploader} [uploader] - 指定要使用的上传器
 * @prop {String} [uploaderName = 'qiniu']] - 指定要使用的上传器的名称
 * @prop {Object} [uploaderOpts = {}] - 指定的上传器的配置
 *
 * @prop {String} [destDir] - 指定远程文件的根目录
 * @prop {String} [baseUrl] - 指定远程文件服务器的 baseUrl
 * @prop {String} [appendDestDirToBaseUrl] - 是否要将远程文件的根目录附加到 baseUrl 上
 *
 * @prop {Number} [concurrence = os.cpus().length * 2] - 同时允许上传的文件数量，默认是 cpu 的个数 * 2
 *                                                       另外，有些 uploader 会强制限制此值
 * @prop {Boolean} [flat] - 将资源扁平化，即去除所有文件夹
 *                          另外，有些 uploader 会强制将此值设置为 true
 *
 * @prop {Number} [hash] - 对文件内容进行 hash，指定保留的 hash 的位数，
 *                        如果 hash 不为 0，会自动在 hash 前面加上 hashPrefix
 * @prop {String} [prefix] - 指定文件名的前缀
 * @prop {String} [suffix] - 指定文件名的后缀
 * @prop {String|Function} [rename = '{prefix}{name}{hash}{suffix}'] - 指定文件名的组成形式，4个关键字都可以使用缩写
 *                如果 rename 是函数，则函数的参数是 (file, {prefix,name,hash,suffix})，函数需要返回带新的 name（不带后缀）
 * @prop {String} [hashSource = 'remote'] - local/remote 根据本地还是远程文件来计算 hash
 * @prop {String} [hashPrefix = '-'] - hash 的前缀，只有在 hash 不为 0 的情况下才会使用，默认是 '-'
 *
 * @prop {String} [runToStep='upload'] - 要执行到的步骤
 *
 * @prop {Array|String|Boolean} [includePatterns] - 要包含的文件的 patterns，如果没有指定，则上传 rootDir 下的所有文件
 * @prop {Array|String|Boolean} [noIncludePatterns]
 *
 * @prop {Array|String|Boolean} [inspectPatterns] - 要 inspect 的文件的 patterns
 * @prop {Array|String|Boolean} [noInspectPatterns]
 *
 * @prop {Array|String|Boolean} [uploadPatterns] - 要上传的文件的 patterns
 * @prop {Array|String|Boolean} [noUploadPatterns]
 *
 * @prop {Array|String|Boolean} [replacePatterns] - 文件上传成功后，要将其中引用的其它静态资源替换掉，
 *                                                        此中指定的文件才会被替换
 * @prop {Array|String|Boolean} [noReplacePatterns]
 *
 * @prop {Array|String|Boolean} [absolutePatterns] - 静态资源替换时，此中指定的文件会使用绝对路径
 * @prop {Array|String|Boolean} [noAbsolutePatterns]
 *
 * @prop {Array|String|Boolean} [renamePatterns] - 是否对文件重命名
 * @prop {Array|String|Boolean} [noRenamePatterns]
 *
 *
 * @prop {Boolean} [overwrite] - 上传时，如果远程出现同名文件，是否覆盖它
 * @prop {Boolean} [diff] - 上传文件前，判断远程是否有同名文件，有的话就对两者内容对比下，相同就忽略上传，
 *                                不同则报错，中断执行；如果指定了 overwrite，则此值无效
 *
 * @prop {Boolean} [ignoreNoneAssetError] - 强制忽略不存在的资源文件，如果不强制忽略，会中断
 * @prop {Boolean} [ignoreDependsError] - 强制忽略静态循环依赖的情况，如果不强制忽略，会中断
 * @prop {Boolean} [ignoreUploadError] - 强制忽略上传失败的文件，继续上传下面的文件
 * @prop {Boolean} [ignoreExistsError] - 强制忽略文件已经存在的提醒，继续上传下面的文件
 * @prop {Boolean} [ignoreConflictError] - 强制忽略本地文件和远程的冲突的提醒，继续上传下面的文件
 *
 * @prop {String} [outDir] - 输出上传并替换后的文件到指定的目录
 * @prop {String} [outSuccess] - 是否输出上传成功的文件
 * @prop {String} [outError] - 是否输出上传失败的文件
 *
 * @prop {Array} [htmlExtensions] - 指定 html 的后缀名
 * @prop {Array} [jsonExtensions] - 指定 json 的后缀名
 * @prop {Array} [cssExtensions] - 指定 css 的后缀名
 * @prop {Array} [jsExtensions] - 指定 js 的后缀名
 *
 * @prop {Boolean} [stack] - 输出错误的 stack，而不是 message
 * @prop {Boolean} [logLevel] - 指定 ylog 的日志级别
 * @prop {Boolean} [dry] - 输出执行的结果，但不执行上传操作
 *
 * @prop {Object} DEFAULTS
 * @prop {ServerEnv} env
 */

// 这里的值会应用到全局的 opts 中
require('es6-shim');
var defaults = {
  logLevel: 'warn',
  hashSource: 'remote',
  concurrence: _os2['default'].cpus().length * 2
};

var STEPS = [_stepsStepInit2['default'], _stepsStepInspect2['default'], _stepsStepReplace2['default'], _stepsStepUpload2['default']];

// 这里的值不会应用到全局，只有在需要的时候程序自动调用
var DEFAULTS = {
  STEP_VALUE_MAP: { init: 1, inspect: 2, replace: 3, upload: 4 },
  APPLY_STEP: {}, // 标识哪些步骤执行了
  RUN_TO_STEP: 'upload',
  RENAME: '{prefix}{name}{hash}{suffix}',
  UPLOADER_NAME: 'qiniu',
  HASH_PREFIX: '-'
};

/**
 *
 * Deploy Asset
 *
 * @global
 * @param {String|Array} any - 要部署的文件，或者文件夹，或者文件的 patterns，或者由它们组成的数组
 * @param {DAOpts} [opts] - 配置选项
 * @param {Function} [callback] - 部署成功的回调函数
 */
function da(any, opts, callback) {

  if (typeof opts === 'function') {
    ;

    var _ref = [callback, opts];
    opts = _ref[0];
    callback = _ref[1];
  } // 创建一个全新的对象，避免修改源头，
  // 并且保证这个 opts 以后不要被重新创建了，因为 callback 中引用了它
  opts = _lodash2['default'].assign({}, defaults, opts);

  opts.DEFAULTS = DEFAULTS;

  var stepVal = undefined;

  var startFn = function startFn(next) {
    next(null, any, opts);
  };

  var endFn = function endFn(err, files) {
    if (typeof callback === 'function') callback(err, files, opts);
  };

  var map = DEFAULTS.STEP_VALUE_MAP;

  stepVal = map[opts.runToStep || DEFAULTS.RUN_TO_STEP];

  if (!stepVal) return endFn(new Error('STEP_NOT_FOUND'));

  Object.keys(map).forEach(function (key) {
    return DEFAULTS.APPLY_STEP[key] = map[key] <= stepVal;
  });

  _async2['default'].waterfall([startFn].concat(STEPS.slice(0, stepVal)), endFn);
}

exports['default'] = da;
module.exports = exports['default'];