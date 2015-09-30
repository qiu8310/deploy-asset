/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

import slash from 'slash';
import ylog from 'ylog';
import path from 'x-path';
import _ from 'lodash';
import url from 'url';

import util from '../util';

let _uploaderMap = {};

/**
 * @typedef {Object} UploaderConfigKey
 * @prop {String} key - 此配置的英文名称
 * @prop {*} value - 此配置的值
 * @prop {String} label - 此配置的中文解释
 * @prop {String} level - 日志级别，如果没有设置，则根据此级别输出日志
 * @prop {Boolean} optional - 是否是可选的
 * @prop {Boolean} secret - 是否是密码字段
 * @prop {*} defaultValue - 默认值
 */

export default class Uploader {

  /**
   * 上传组件的基类
   *
   * @mixin
   * @param {ServerEnv} env
   * @param {Object} opts - 上传模块需要的配置， 由 {@link da}.opts.uploaderOptions 透传过来的
   * @constructor
   *
   */
  constructor(env, opts = {}) {
    /**
     * @type String
     */
    this.name = opts.name;

    /**
     *  静态资源是否必须扁平化
     *
     *  扁平化即将所有静态资源的目录结构去掉，所以文件都放在一个目录下
     *
     *  @type {Boolean}
     *
     */
    this.mustFlatAssets = false;

    /**
     * 最大允许的同时进行的任务数，0 表示使用默认的配置
     * @type {number}
     */
    this.maxConcurrentJobs = 0;

    /**
     * 是否上传完成后才返回远程链接，如果是的话，那么 maxConcurrentJobs 一定要为 1
     * @TODO 暂时不支持此配置
     * @type {boolean}
     */
    this.retrieveRemoteUrlAfterUploaded = false;

    /**
     * @type ServerEnv
     */
    this.env = env;

    /**
     * logger 组件
     * @type {ylog}
     */
    this.log = ylog;

    /**
     * @type slash
     */
    this.slash = slash;

    /**
     * 标识此 uploader 刚运行过的函数
     *
     * initService => 1
     * beforeUpload => 2
     * afterUpload => 4
     * destroyService => 5
     *
     * 其它函数都是 3
     *
     * @type {Number}
     */
    this.status = 0;


    this._configKeys = null;
    this._initOpts(opts);
    this._initAsyncFunctions();
  }

  /**
   * 获取所有可配置的相关选项的属性
   * @type {Array<UploaderConfigKey>}
   */
  get configKeys() {

    if (this._configKeys) return this._configKeys;

    let result = this._configKeys = [];
    let allConfig = this.constructor.config || {};

    Object.keys(allConfig).forEach(level => {
      let confs = allConfig[level];
      Object.keys(confs).forEach(key => {
        let conf = confs[key];
        let label,
          defaultValue,
          secret = false,
          optional = level !== 'error';
        if (typeof conf === 'string') {
          label = conf;
        } else if (Array.isArray(conf)) {
          label = conf[0];
          defaultValue = conf[1];
          secret = !!conf[2];
        } else {
          label = conf.label;
          secret = !!conf.secret;
          defaultValue = conf.defaultValue;
        }
        result.push({key, level, optional, label, secret, defaultValue});
      });
    });

    return result;
  }

  /**
   * 初始化 opts 之前调用
   * @param {Object} opts
   * @returns {Object}
   */
  beforeInitOpts(opts) {}

  /**
   * 上传组件的基类
   *
   * @private
   * @param {Object} opts - 对 opts 进行初始化，并写入 this 中
   * @throws UPLOADER_CONFIG_ERROR
   *
   */
  _initOpts(opts) {
    let result = {};

    opts = this.beforeInitOpts(opts) || opts;

    this.configKeys.forEach(ck => {

      let key = ck.key;

      ck.value = key in opts ? opts[key] : ck.defaultValue;
      result[key] = ck.value;

      let keyStr = ` &${ck.label} <${key}>& `,
        valStr = ck.secret ? ' ![secret]! ' : ` ^${JSON.stringify(ck.value)}^ `;

      if (key in opts) {
        this.log.verbose(`Uploader 配置:${keyStr}=>${valStr}`);
      } else {
        if ('defaultValue' in ck) {
          this.log[ck.level](`Uploader 配置:${keyStr}=>${valStr} *(默认值)*`)
        } else {
          this.log[ck.level](`Uploader 配置:${keyStr} *(没有设置)*`);
        }

        if (!ck.optional && ['domain', 'baseUrl'].indexOf(key) < 0) {
          throw new Error('UPLOADER_CONFIG_ERROR');
        }
      }
    });

    this.opts = result;
  }

  _initAsyncFunctions() {
    [
      'initService', 'beforeUpload', 'afterUpload', 'destroyService',
      'beforeUploadFile', 'afterUploadFile', 'isRemoteFileExists', 'removeRemoteFile',
      'getRemoteFileContent', 'uploadFile'
    ].forEach((fnKey, i) => {

        let fn = this[fnKey];
        let fnStr = fn.toString();
        let match = fnStr.match(/^\s*function\s*(?:\w+)?\s*\(([^\)]*)\)([\s\S]*)$/);

        // 前 4 个第一个参数是 callback，后面是第二个参数是 callback
        let args = match[1].trim().split(/\s*,\s*/);
        let callback = i < 4 ? args[0] : args[1];
        let isAsync = false;

        // 定义了 callback 并且 callback 被调用才当作是异步函数
        if (callback) {
          isAsync = new RegExp('\\b' + callback + '\\b').test(match[2]);
        }

        this[fnKey] = (...args) => {
          let done, rtn, err, lastIndex = args.length - 1;
          this.status = i < 2 ? i + 1 : (i < 4 ? i + 2 : 3);
          done = args[lastIndex];

          if (isAsync) {
            args[lastIndex] = (err, rtn) => {
              err = util.normalizeError(err);
              done(err, rtn);
            };
            fn.apply(this, args);
          } else {
            try {
              rtn = fn.apply(this, args);
            } catch (e) {
              err = e;
            }
            process.nextTick(() => done(err, rtn));
          }
        }
      });
  }


  /**
   * 获取一个本地的临时的文件路径
   * @returns {String}
   */
  static getLocalTmpFilePath() {
    return path.join(path.tempdir(), Math.random().toString(32).substr(2) + Date.now());
  }

  /**
   * 下载文件
   * @param {String} src
   * @param {Function} done
   */
  static download(src, done) {
    let urlObj = url.parse(src);
    let protocol = urlObj.protocol.slice(0, -1);
    let ended = false;

    let end = (err, content) => {
      if (ended) return false;
      done(err, content);
    };
    try {
      let req = require(protocol).request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || 80,
          path: urlObj.path,
          method: 'GET'
        },

        res => {
          let content = [];
          if (res.statusCode >= 400) {
            end({statusCode: res.statusCode});
          } else {
            res.on('data', buffer => content.push(buffer));
            res.on('error', end);
            res.on('end', () => end(null, Buffer.concat(content)));
          }
        }
      );
      req.on('error', end);
      req.end();
    } catch(e) {
      end(e);
    }
  }

  /**
   *
   * 注册新的上传组件，请用 `da.registerUploader` 形式调用
   *
   * 如何写新的 uploader，可以参考 {@link QiniuUploader}
   *
   * @param {String} name - 模块名称
   * @param {Uploader} uploaderCtor - uploader 函数
   * @see QiniuUploader
   */
  static register(name, uploaderCtor) {
    if (name in _uploaderMap) {
      throw new Error(`Uploader ${name} already exists, can't be registered.`);
    }
    _uploaderMap[name] = uploaderCtor;
  }

  /**
   * 实例化一个 Uploader，如果指定的 name 不存在，会抛出异常
   *
   * 如果要定义一个自己的 Uploader，参考 {@link Uploader.register}
   *
   * @param {String} name - 要 实例化的 Uploader 名称
   * @param {Object} opts - 给 要实例化的 Uploader 初始化用
   * @param {ServerEnv} env
   * @throws {Error}
   */
  static instance(name, opts, env) {
    opts.name = name;
    if (name in _uploaderMap) return new _uploaderMap[name](opts, env);

    let Ctor, filePath = path.join(__dirname, _.capitalize(name) + 'Uploader');

    try { Ctor = require(filePath); } catch (e) { throw new Error('UPLOADER_NOT_FOUND'); }

    return new Ctor(env, opts);
  }

  /**
   * 初始化服务，支持异步
   * @abstract
   * @param {Function} done
   */
  initService(done) {}

  /**
   * 销毁服务，上传完成（不管成功失败都会执行此函数），支持异步
   * @abstract
   * @param {Function} done
   */
  destroyService(done) {}

  /**
   * 在上传操作之前调用此函数，支持异步
   * @abstract
   * @param {Function} done
   */
  beforeUpload(done) {}

  /**
   * 在上传操作之后调用此函数，支持异步
   * @abstract
   * @param {Function} done
   */
  afterUpload(done) {}

  /**
   * 在文件 {@link File} 上传之前执行，支持异步
   *
   * @abstract
   * @param {File} file
   * @param {Function} done
   */
  beforeUploadFile(file, done) {}

  /**
   * 在文件 {@link File} 上传之后执行，支持异步
   *
   * @abstract
   * @param {File} file
   * @param {Function} done
   */
  afterUploadFile(file, done) {}

  /**
   * 判断远程文件是否已经存在
   * @abstract
   * @param {File} file - 要上传的文件对像
   * @param {Function} done - 回调函数, 参数：Error, Boolean
   */
  isRemoteFileExists(file, done) {}

  /**
   * 删除远程文件
   * @abstract
   * @param {File} file - 要删除的文件
   * @param {Function} done - 回调函数, 参数：Error, Boolean
   */
  removeRemoteFile(file, done) {}

  /**
   * 获取远程文件内容
   * @abstract
   * @param {File} file - 要获取内容的文件
   * @param {Function} done - 回调函数, 参数：Error, String
   */
  getRemoteFileContent(file, done) {}

  /**
   *
   * 异步上传一个文件
   *
   * @abstract
   * @param {File} file - 要上传的文件对像
   * @param {Function} done - 上传后的回调函数
   */
  uploadFile(file, done) {}



  _runStart(started, end) {
    ylog.info.subtitle('uploader.initService...');
    this.initService(err => {
      if (err) return end(err);

      ylog.info.subtitle('uploader.beforeUpload...');
      this.beforeUpload(err => {
        if (err) return end(err);

        started(end);
      });
    });
  }
  _runEnd(lastError, finished) {
    ylog.info.subtitle('uploader.afterUpload...');
    this.afterUpload(secondError => {
      ylog.info.subtitle('uploader.destroyService...');

      this.destroyService(thirdError => {
        let err = lastError || secondError || thirdError;

        finished(err);
      });
    });
  }

  /**
   * 为要执行的一系列上传操作创建环境，及在完成后销毁环境
   * @param {Function} started - uploader 初始化完成后会调用此函数，第一个参数是个 callback
   * @param {Function} finished - uploader 销毁完后会调用此函数，第一个参数可能是个 error
   */
  run(started, finished) {
    this._runStart(started, (err) => this._runEnd(err, finished));
  }
}

