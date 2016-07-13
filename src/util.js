import minimatch from 'minimatch';
import path from 'x-path';
import ylog from 'ylog';
import _ from 'lodash';
import crypto from 'crypto';

import FileType from './FileType';

/**
 * 得到文件（不包括文件夹）的公共目录
 * @param {Array<String>} filePaths - 所有文件路径，至少要有一个
 * @returns {String}
 */
function getFilesCommonDirectory(filePaths) {
  if (filePaths.length === 1) return path.dirname(filePaths[0]);
  filePaths = filePaths.map(f => path.resolve(f));

  let refs = filePaths[0].split(/\\|\//);

  let dir = refs[0] || '/'; // 非 windows 下第一个值是 ''，将它转化成根目录

  let check = (dir) => (filePath) => {
    return filePath.indexOf(dir) === 0 && ['/', '\\'].indexOf(filePath[dir.length]) >= 0;
  };

  let matchOnce = false;

  for (let i = 1; i < refs.length; i++) {
    if (filePaths.every(check(path.join(dir, refs[i])))) dir = path.join(dir, refs[i]);
    else break;
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
  return baseUrl.replace(/^(\w+:\/\/)?(.*?)(\/)?$/, function(raw, prefix, mid, postfix) {
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
function urlJoin(baseUrl, ...parts) {
  parts = parts
    .map(part => part.replace(/\\/g, '/').replace(/^\/|\/$/g, ''))
    .filter(part => part && part.length);

  return normalizeBaseUrl(baseUrl) + parts.join('/');
}

/**
 * 有些平台的 api 返回的错误并不是一个 js 的 Error 实例，这里把所有错误转化成一个 js 的 Error 实例
 * @param {*} err
 * @returns Error
 */
function normalizeError(err) {
  if (!err) { return err; }
  if (err && err instanceof Error) { return err; }

  return new Error(JSON.stringify(err));
}


export default {

  md5(str) {
    let hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
  },

  banner(title) {
    ylog.info.ln.ln.log('===============').title(`**${title}**`).log('===============').ln();
  },

  error(err, level = 'warn', stack = false) {
    ylog.color(level === 'warn' ? 'yellow' : 'red')[level](stack ? err : err.message);
  },


  urlJoin,
  normalizeError,
  normalizeBaseUrl,
  getFilesCommonDirectory,

  /**
   * @param {Array} list
   * @param {Array|String} patterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  match(list, patterns, mapFn = null) {
    if (!Array.isArray(patterns)) patterns = [patterns];
    return list.filter(it => patterns.some(pattern => minimatch(mapFn ? mapFn(it) : it, pattern)));
  },

  /**
   * @param {Array} list
   * @param {Array|String|Boolean} patterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  applyWhitelist(list, patterns, mapFn = null) {
    if (patterns === false) return [];
    if (!patterns || patterns.length === 0 || patterns === true) return list;

    return _.intersection(list, this.match(list, patterns, mapFn));
  },

  /**
   * @param {Array} list
   * @param {Array|String|Boolean} patterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  applyBlacklist(list, patterns, mapFn = null) {
    if (patterns === true) return [];
    if (!patterns || patterns.length === 0 || patterns === false) return list;

    return _.difference(list, this.match(list, patterns, mapFn));
  },

  /**
   * @param {Array} list
   * @param {Array|String|Boolean} whitePatterns
   * @param {Array|String|Boolean} blackPatterns
   * @param {Function} [mapFn = null]
   * @returns {Array}
   */
  applyWhiteAndBlackList(list, whitePatterns, blackPatterns, mapFn = null) {
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
  getFileType(filename, opts = {}, defaultType = FileType.STATIC.value) {
    let ext = filename.split('.').pop();
    let type = defaultType;
    let keys = _.keys(FileType);
    let has = (custom) => {
      return keys.some(key => {
        let ft = FileType[key];
        let extensions = custom ? opts[ft.value + 'Extensions'] : ft.extensions;
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
