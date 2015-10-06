import fs from 'fs-extra';
import path from 'x-path';
import glob from 'glob';
import ylog from 'ylog';

import util from '../util';
import ServerEnv from '../ServerEnv';
import Uploader from '../uploaders/Uploader';


function _initUploader(opts, DEFAULTS) {

  let uploader = opts.uploader,
    uploaderOpts, uploaderName;

  if (uploader instanceof Uploader) {
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
  let uploader = opts.uploader;
  //if (DEFAULTS.APPLY_STEP.upload) {
  if (!(uploader instanceof Uploader))
    uploader = Uploader.instance(opts.uploaderName, opts.uploaderOpts, opts.env);

  opts.uploader = uploader;
  _configOptsAccordingUploader(opts, uploader);
  //}
}

function _configOptsAccordingUploader(opts, uploader) {
  if (uploader.mustFlatAssets && !opts.flat) {
    ylog.warn(`${opts.uploaderName}上传器需要扁平化静态资源，所以自动设置 ~opts.flat = true~ `);
    opts.flat = true;
  }

  let max = uploader.maxConcurrentJobs;
  if (max > 0 && max < opts.concurrence) {
    ylog.warn(`${opts.uploaderName}上传器最大允许的同步任务数是 !${max}! ，所以自动设置 ~opts.concurrence = ${max}~ `);
    opts.concurrence = max;
  }

  if (uploader.retrieveRemoteUrlAfterUploaded && opts.concurrence !== 1) {
    ylog.warn(`${opts.uploaderName}上传器需要在文件上传完后才能返回文件链接，`
      + `所以无法异步上传，自动设置 ~opts.concurrence = ${max}~ `);
    opts.concurrence = 1;
  }
}

function _filterOutOpts(opts) {
  let rtn = {}, rejects = ['DEFAULTS', 'uploader'];
  Object.keys(opts).forEach(k => {
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
export default function (any, opts, next) {

  try {

    util.banner('初始化');

    let DEFAULTS = opts.DEFAULTS;

    _initUploader(opts, DEFAULTS);

    ylog.setLevel(opts.logLevel);
    ylog.info('选项', _filterOutOpts(opts)).ln();

    if (opts.overwrite && opts.diff) return next(new Error('OVERWRITE_AND_DIFF_CONFLICT'));

    // 遍历当前文件夹，找到所有文件
    let filePaths = _parseDaAnyArgument(any.length ? any : opts.rootDir);
    if (filePaths.length === 0) return next(new Error('NO_FILES'));

    // 获取根目录
    let rootDir = opts.rootDir;
    if (!rootDir)
      rootDir = typeof any === 'string' && path.isDirectorySync(any) ? any : util.getFilesCommonDirectory(filePaths);

    rootDir = path.resolve(rootDir);
    opts.rootDir = rootDir; // 保证 rootDir 是绝对路径

    // 将文件转化成相对 rootDir 的路径
    filePaths = filePaths.map(filePath => path.relative(rootDir, path.resolve(filePath)));

    ylog.info('根目录: ^%s^', rootDir).ln();
    process.chdir(rootDir);

    // 保证所有文件都在根目录内
    let notAllInRoot = filePaths.some(filePath => {
      if (filePath.substr(0, 2) === '..') {
        ylog.error('文件 ^%s^ 不在根目录内', path.resolve(filePath));
        return true;
      }
    });
    if (notAllInRoot) return next(new Error('FILE_NOT_IN_ROOT_DIR'));

    // 根据黑白名单过滤 filePaths
    ylog.verbose('根据 any 参数找到文件 *%o*', filePaths);
    filePaths = util.applyWhiteAndBlackList(filePaths, opts.includePatterns, opts.noIncludePatterns);
    ylog.verbose('include 和 noInclude 过滤后的文件 *%o*', filePaths);

    if (!filePaths.length) return next(new Error('NO_FILE_AFTER_FILTER'));


    _createUploader(opts, DEFAULTS);
    opts.env = new ServerEnv(opts);
    opts.uploader.env = opts.env;


    next(null, filePaths, opts);

  } catch (e) { next(e); }
}



/**
 * 解析 da 的第一个参数
 * @private
 * @param {String|Array} any
 * @returns {Array<String>}
 * @throws ANY_ARGUMENT_ERROR
 */
function _parseDaAnyArgument(any) {
  let filePaths = [];

  if (Array.isArray(any)) {
    any.forEach(a => filePaths.push(..._parseDaAnyArgument(a)));
  } else if (typeof any === 'string') {
    try {
      let stat = fs.statSync(any);
      if (stat.isFile()) {
        filePaths.push(any);
      } else if (stat.isDirectory()) {
        filePaths.push(...getAllFilesInDirectory(any));
      }
    } catch (e) {
      filePaths.push(...glob.sync(any, {nodir: true}));
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
  let cwd = process.cwd();
  let result = [];
  fs.readdirSync(dir).forEach(filePath => {
    if (filePath[0] !== '.') {
      filePath = path.join(dir, filePath);
      let stat = fs.statSync(filePath);
      if (stat.isFile()) {
        result.push(path.relative(cwd, filePath));
      } else if (stat.isDirectory()) {
        result.push(...getAllFilesInDirectory(filePath));
      }
    }
  });
  return result;
}
