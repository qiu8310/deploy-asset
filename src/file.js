/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

import ylog from 'ylog';
import path from 'x-path';
import mime from 'mime';
import slash from 'slash';
import crypto from 'crypto';
import _ from 'lodash';
import alter from 'alter';
import fs from 'fs-extra';

import FileType from './FileType';
import AllPatterns from './patterns';
import util from './util';

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

export default class File {

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
  constructor(filePath, rootDir, opts = {}, asset = {}) {

    filePath = path.resolve(filePath);
    rootDir = path.resolve(rootDir);

    let relativePath = path.relative(rootDir, filePath);


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
    this.content = fs.readFileSync(filePath);

    /**
     * 当前文件的 mime 文件类型
     * @type {String}
     */
    this.mimeType = mime.lookup(filePath);

    /**
     * 当前文件目录
     * @type {String}
     */
    this.dirname = path.dirname(filePath);

    /**
     * 当前文件名称
     * @type {String}
     */
    this.basename = path.basename(filePath);

    /**
     * 此文件的目录相对根目录的路径
     * @NOTE 不能使用 path.dirname(relativePath)，这样的话会出现值为 "." 的情况
     * @type {String}
     */
    this.relativeDir = path.relative(rootDir, this.dirname);

    /**
     * 当前文件后缀名，包含 '.'
     * @type {String}
     */
    this.extname = path.extname(filePath);

    /**
     * 当前文件的后缀名，不包含 '.'
     * @type {String}
     */
    this.ext = this.extname.substr(1);

    /**
     * 文件的名称，不包括后缀
     * @type {string}
     */
    this.name = this.basename.slice(0, - this.extname.length);

    /**
     * 文件类型
     * @type {String}
     */
    this.type = asset.type && asset.type !== 'unknown' ? asset.type : util.getFileType(filePath, opts);

    /**
     * 根据黑名单，白名单得到的一些配置项
     * @type {{inspect: boolean, upload: boolean, replace: boolean, rename: boolean, absolute: boolean}}
     */
    this.apply = {
      inspect: true,  // 是否要执行 inspectAssets
      upload: true,   // 是否要上传文件
      replace: true,  // 是否要替换里面的静态资源
      rename: true,   // 是否重命名
      absolute: true // 执行 replace 时，是否使用绝对路径来替换；只有在 replace 为 true 时才有效
    };

    _.each(this.apply, (val, key) => {
      let whiteList = opts[key + 'Patterns'];
      let blackList = opts['no' + _.capitalize(key) + 'Patterns'];
      this.apply[key] = util.applyWhiteAndBlackList([relativePath], whiteList, blackList).length;
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

  /**
   * 文件是否应该保存到本地
   *
   * 条件是：此文件不要上传，但它包含有要上传的静态资源，并且要执行替换资源操作
   *
   * @returns {boolean}
   */
  shouldSave() {
    return !this.apply.upload &&
      this.apply.replace &&
      this.assets.length &&
      this.assets.some(f => File.findFileInRefs(f.filePath).apply.upload);
  }


  /**
   * 根据文件路径，找到对应的文件
   * @param {String} filePath
   * @returns {File|Undefined}
   */
  static findFileInRefs(filePath) {
    return File.refs[path.resolve(filePath)];
  }

  /**
   * @returns {string} 当前文件内容的字符串
   */
  get contentString() { return this.content.toString(); }
  /**
   * @returns {string} 将要上传到服务器上的文件内容的字符串
   */
  get remoteContentString() { return this.remote.content.toString(); }

  /**
   * 根据配置，得到远程文件的 basename
   */
  updateRemoteBasename() {
    if (this.remote.basename) return this.remote.basename;
    if (!this.apply.rename) {
      this.remote.basename = this.basename;
      return this.basename;
    }

    let opts = this.opts;
    let hash = parseInt(opts.hash, 10);
    if (hash && hash > 0) {
      let md5 = crypto.createHash('md5');
      let hashPrefix = 'hashPrefix' in opts ? opts.hashPrefix : opts.DEFAULTS.HASH_PREFIX;
      md5.update(opts.hashSource === 'remote' ? this.remoteContentString : this.contentString);
      hash = hashPrefix + md5.digest('hex').substr(0, hash);
    } else {
      hash = '';
    }

    let map = {
      name: this.name,
      prefix: opts.prefix || '',
      suffix: opts.suffix || '',
      hash
    };
    let keys = Object.keys(map);
    let rename = opts.rename || opts.DEFAULTS.RENAME;
    let name;
    if (typeof rename === 'function') {
      name = rename(this, map);
    } else {
      name = rename.replace(/\{(\w+)\}/g, (raw, k) => {
        k = _.find(keys, key => key.indexOf(k) === 0);
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
  updateRemoteUrl() {
    let remote = this.remote;
    if (remote.url) return remote.url;
    remote.url = this.opts.env.getFileRemoteUrl(this);
    return remote.url;
  }

  /**
   * 同时更新 remote.basename 和 remote.url
   */
  updateRemote() {
    this.updateRemoteBasename();
    this.updateRemoteUrl();
  }

  /**
   * 添加调用此文件的父文件
   * @param {File} file
   */
  addCaller(file) {
    if (this.callers.indexOf(file) < 0) this.callers.push(file);
  }

  /**
   * 遍历此文件内容，找到此文件所包含的其它静态资源文件
   *
   * @param {Function} [filter]
   * @NOTE inspect 被 node 的 console 使用了，所以起了此名字
   */
  insp(filter) {
    let patterns = AllPatterns[this.type];
    let assets = [];

    if (!this.apply.inspect) ylog.verbose('*此文件指定为忽略检查*');
    else if (this.type === File.STATIC_TYPE) ylog.verbose('*此文件类型不支持检查*');
    else if (!patterns || !patterns.length) ylog.verbose('*此文件类型没有对应的匹配规则*');
    else {
      let relativeDirs = [this.dirname];
      // 如果是 JS 或 JSON 文件，则相对路径是调用它文件的目录，CSS 和 HTML 文件中的资源都是相对于此文件本身的
      if ([File.JSON_TYPE, File.JS_TYPE].indexOf(this.type) >= 0)
        this.callers.forEach(file => {
          if (relativeDirs.indexOf(file.dirname) < 0) relativeDirs.push(file.dirname);
        });

      assets = patterns.reduce((all, pattern) => {
        return all.concat(this._inspectAssetsUsePattern(pattern, relativeDirs));
      }, []);

      if (typeof filter === 'function') {
        ylog.info('执行 ~inspectCallback~ ...');
        assets = filter(this, assets);
      }
    }

    this.assets = assets;
    return assets;
  }


  /**
   * 根据此文件的 assets，创建对应的 files
   */
  resolveAssets() {
    this.assetFiles = this.assets.map(asset => {
      let file = File.findFileInRefs(asset.filePath);
      if (!file) file = new File(asset.filePath, this.opts.rootDir, this.opts, asset);
      file.addCaller(this);
      return file;
    });
    return this.assetFiles;
  }

  _inspectAssetsUsePattern(pattern, relativeDirs) {
    let result = [];
    ylog.silly(pattern.msg + '： **%s**', pattern.re);
    this.remoteContentString.replace(pattern.re, (raw, src, index) => {

      ylog.silly(' 找到 *%s*', src);

      // 如果是以 \w+: 或 // 开头的文件 ，则忽略，如 http://xxx.com/jq.js, //xxx.com/jq.js, javascript:;
      if (/^(?:\w+:|\/\/)/.test(src)) return raw;

      // 去掉 src 中的 ? 及 # 之后的字符串
      src = src.replace(/[\?|#].*$/, '').trim();

      // 如果剩下的是个空字符串，当然也去掉
      if (!src) return raw;

      // 如果是绝对路径，需要把当前路径放到相对路径中去
      if (src[0] === '/' && relativeDirs.indexOf(this.rootDir) < 0)
        relativeDirs.unshift(this.rootDir);

      // 用指定的函数过滤下
      let start = index + raw.indexOf(src);
      let end = start + src.length;
      let assetPath;

      let assetRelative = pattern.inFilter ? pattern.inFilter(src) : src;

      // 从 relativeDirs 中查找 assetPath
      relativeDirs.some(dir => {
        let tmpFilePath = path.join(dir, assetRelative);
        if (path.isFileSync(tmpFilePath)) {
          assetPath = tmpFilePath;
          return true;
        }
      });

      if (pattern.exists && !assetPath) {
        let force = this.opts.ignoreNoneAssetError;
        let level = force ? 'warn' : 'error';
        ylog[level]('文件 ^%s^ 中的静态资源 ~%s~ 无法定位到', this.relativePath, assetRelative);

        if (!force) {
          ylog[level]('可以启用 ~ignoreNoneAssetError~ 来忽略此错误');
          throw new Error('NONE_ASSET');
        }
      }

      if (assetPath) {
        assetPath = path.relative(this.rootDir, assetPath);
        ylog.silly('  => *%s*', assetPath);
        let asset = {pattern, start, end, raw, src, target: null, filePath: path.resolve(assetPath)};
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
  replace() {
    let result = [];
    if (!this.apply.replace) ylog.verbose('*此文件指定为忽略替换*');
    else if (this.type === File.STATIC_TYPE) ylog.verbose('*此文件类型不支持替换*');
    else if (!this.assets.length) ylog.verbose('*此文件没有依赖其它静态资源*');
    else {
      this.remote.content = new Buffer(alter(this.remoteContentString, this.assets.map(asset => {

        let assetFilePath = asset.filePath;
        let assetRemote = File.findFileInRefs(assetFilePath).remote;
        let assetUrl;

        // 这里需要依赖于 asset 的 url 和 basename
        if (this.apply.absolute) {
          assetUrl = assetRemote.url;
        } else {
          assetUrl = slash(path.relative(this.remote.relative, path.join(assetRemote.relative, assetRemote.basename)));
        }

        if (asset.pattern.outFilter)
          assetUrl = asset.pattern.outFilter(assetUrl);

        asset.target = assetUrl;
        result.push(asset);
        return {start: asset.start, end: asset.end, str: assetUrl};
      })));
    }

    return result;
  }

  /**
   * 上传文件
   * @private
   * @param {Function} done
   */
  upload(done) {
    let fileStr = this.relativePath;
    if (!this.apply.upload) {
      ylog.info.title('忽略上传文件 ^%s^', fileStr);
      done();
    } else {
      ylog.info.title('开始上传文件 ^%s^', fileStr);

      let end = (err) => {
        if (this.status.success)
          ylog.info.writeOk('上传文件 ^%s^ => ^%s^ 成功', fileStr, this.remote.url);
        done(err);
      };

      this._beforeUpload(err => {
        if (err) return end(err);
        this._upload(err => {
          if (err) return end(err);
          this._afterUpload(end);
        });
      });
    }
  }

  _judgeExists(uploader, error, success, isDiff) {
    uploader.isRemoteFileExists(this, (err, exists) => {
      if (err) return error(err);

      this.status.exists = exists;

      if (exists) {
        if (isDiff) return success();

        let ignore = this.opts.ignoreExistsError;
        let level = ignore ? 'warn' : 'error';
        ylog[level].writeError('文件 ^%s^ 上传失败，远程文件 ^%s^ 已经存在', this.relativePath, this.remote.url);

        if (!ignore)
          ylog[level]('你可以启用 ~ignoreExistsError~ 来忽略此错误，但不会继续上传文件')
            .ln.log('  或者启用 ~overwrite~ 来强制覆盖远程文件')
            .ln.log('  或者启用 ~diff~ 来和远程文件比对，如果一致则无需上传');

        error(ignore ? null : new Error('REMOTE_FILE_EXISTS'));

      } else {
        if (isDiff) return error();

        success();
      }
    });
  }
  _judgeConflict(uploader, error, success) {
    uploader.getRemoteFileContent(this, (err, content) => {
      if (err) return error(err);

      this.status.conflict = this.remote.content.compare(content) !== 0;

      if (this.status.conflict) {
        let ignore = this.opts.ignoreConflictError;
        let level = ignore ? 'warn' : 'error';
        ylog[level].writeError(
          '文件 ^%s^ 上传失败，它和远程文件 ^%s^ 的内容不一致（注意：在浏览器上看到的结果可能并不是最新的）',
          this.relativePath, this.remote.url);

        if (!ignore)
          ylog[level]('你可以启用 ~ignoreConflictError~ 来忽略此错误，但不继续上传文件')
            .ln.log('  或者关闭 ~diff~ 来忽略和远程文件的对比');

        error(ignore ? null : new Error('REMOTE_FILE_CONFLICT'));

      } else {
        success();
      }

    });
  }
  _judgeUploaded(uploader, error, success) {
    if (this.opts.dry) {
      this.status.success = true;
      return success();
    }

    uploader.uploadFile(this, err => {
      this.status.uploaded = !err;
      let ignore = this.opts.ignoreUploadError;
      let level = ignore ? 'warn' : 'error';
      if (err) {
        ylog[level].writeError('上传文件 ^%s^ => ^%s^ 失败', this.relativePath, this.remote.url);
        if (!ignore) ylog[level]('你可以启用 ~ignoreUploadError~ 来忽略此错误');

        util.error(err, level, this.opts.stack);
        error(ignore ? null : new Error('UPLOAD_ERROR'));
      } else {
        this.status.success = true;
        success();
      }
    });
  }

  _upload(callback) {
    let {uploader, ignoreUploadError, ignoreExistsError, ignoreDiffError, overwrite, diff} = this.opts;

    if (!overwrite && !diff) {
      this._judgeExists(uploader, callback, () => {
        this._judgeUploaded(uploader, callback, callback);
      });
    } else if (overwrite) {
      this._judgeUploaded(uploader, callback, callback);
    } else if (diff) {
      this._judgeExists(uploader, callback, () => {
        this._judgeConflict(uploader, callback, () => {
          this.status.success = true; // 文件一样，就不需要上传了
          callback();
        });
      }, diff);
    } else {
      throw new Error('OVERWRITE_DIFF_CONFLICT');
    }
  }

  _beforeUpload(callback) {
    this.opts.uploader.beforeUploadFile(this, callback);
  }
  _afterUpload(callback) {
    this.opts.uploader.afterUploadFile(this, callback);
  }
}

/*
 一此常量，标识文件的类型
 */
File.STATIC_TYPE = FileType.STATIC.value;
File.HTML_TYPE = FileType.HTML.value;
File.JSON_TYPE = FileType.JSON.value;
File.CSS_TYPE = FileType.CSS.value;
File.JS_TYPE = FileType.JS.value;

/*
 所有文件的引用都放在这里
 */
File.refs = {};
