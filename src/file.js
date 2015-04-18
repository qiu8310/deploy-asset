/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var path = require('x-path'),
  fs = require('fs'),
  crypto = require('crypto');

var _ = require('lodash'),
  log = require('npmlog'),
  async = require('async'),
  alter = require('alter'),
  rm = require('rimraf').sync,
  mkdirp = require('mkdirp').sync;

var patterns = require('./patterns'),
  Uploader = require('./uploader');

/**
 * 所有的文件类型
 *
 * 包括 `HTML`, `JS`, `CSS`, `JSON`, `STATIC` 五大类
 *
 * @memberof File
 * @type {Object}
 */
var TYPE = {
  HTML: 'html',
  JS: 'js',
  CSS: 'css',
  JSON: 'json',
  STATIC: 'static'
};

/**
 * 所有文件的 hash，hash 的 key 是文件路径， value 是 {@link File} 对象
 * @private
 * @type {Object}
 */
var MAP = {};
var typeValues = _.values(TYPE);
var OPTS = null;


/**
 * 获取远程的 basename
 *
 * @param {String} oldBasename
 * @param {String} path
 * @param {String} content
 * @returns {String}
 * @private
 */
function _reBasename(oldBasename, path, content) {
  if (_.isFunction(OPTS.rename)) {
    var rtn = OPTS.rename(oldBasename, path, content);
    if (_.isString(rtn)) {
      return rtn;
    }
  }

  var len = _.isNumber(OPTS.rename) ? OPTS.rename : 8;
  var md5 = crypto.createHash('md5');
  md5.update(content);
  return oldBasename.replace(/(\.\w*)$/, '-' + md5.digest('hex').substr(0, len) + '$1');
}

/**
 * 根据后缀名来判断文件的类型
 * @param {String} filepath
 * @returns {String}
 * @private
 */
function _detectFileType(filepath) {
  return _.find(typeValues, function(k) {
    return OPTS[k + 'Exts'] && OPTS[k + 'Exts'].indexOf(path.extname(filepath).substr(1)) >= 0;
  }) || TYPE.STATIC;
}

/**
 * 自定义的文件节点
 *
 * @param {String} file - 文件路径
 * @param {Object} opts
 * @param {File.TYPE} [opts.type = File.TYPE.STATIC] - 指定文件的类型
 * @class
 */
function File(file, opts) {
  /**
   * 所有引用了此文件的 Files
   * @type {Array}
   */
  this.callers = [];

  /**
   * 所有此文件包含的资源
   *
   * @example
   * {start: 34, end 60, filepath: ...}
   *
   * @type {Array}
   */
  this.assets = [];

  /**
   * 当前文件的路径
   * @type {String}
   */
  this.path = file;

  /**
   * 当前文件的相对目录
   * @type {String}
   */
  this.dirname = path.dirname(file);

  /**
   * 当前文件的内容
   * @type {String}
   */
  this.content = fs.readFileSync(file).toString();

  /**
   * 当前文件的 basename
   * @type {String}
   */
  this.basename = path.basename(file);

  /**
   * 当前文件的 extension，不包含 '.'
   * @type {String}
   */
  this.ext = path.extname(file).substr(1);

  /**
   * 当前文件的类型
   * @type {String}
   */
  this.type = opts.type || _detectFileType(file);

  /**
   * 远程服务器上的文件信息
   * @type {Object}
   */
  this.remote = {
    basename: OPTS.prefix + _reBasename(this.basename, this.path, this.content),
    path: null
  };
}


/**
 * 解析单个 pattern，得到文件中的资源
 * @param {Object} pattern - {@link patterns} item
 * @param {Array} relativeDirs
 * @returns {Array}
 * @private
 */
File.prototype._getAssetsFromPattern = function(pattern, relativeDirs) {
  var file = this;
  log.silly('\tpattern desc', pattern.msg);

  var all = [];
  file.content.replace(pattern.re, function(raw, src, index) {
    // 如果是以 \w+:// 或 // 开头的文件 ，则忽略
    if (/^(\w+:)?\/\//.test(src)) { return raw; }

    // 去掉 src 中的 ? 及 # 之后的字符串
    src = src.replace(/[\?|#].*$/, '');

    // 用指定的函数过滤下
    var start = index + raw.indexOf(src);
    var end = start + src.length;
    if (_.isFunction(pattern.inFilter)) { src = pattern.inFilter(src); }

    var filepath = _.find(relativeDirs, function(dir) {return path.isFileSync(path.join(dir, src)); });

    // 文件需要存在 但并不存在 时
    if (pattern.exists && !filepath) {
      var logType = OPTS.force ? 'warn' : 'error';
      if (/\{.*\}|<.*>/.test(src)) {
        log[logType]('template string can\'t resolve to local file', '%s in %s at', src, file.path, start);
      } else {
        log[logType]('file not exists', '%s in %s at %d', src, file.path, start);
      }
      if (!OPTS.force) {
        log.error('Use force option to proceed');
        throw new Error('File ' + src + ' not exists');
      }
    }

    if (filepath) {
      filepath = path.join(filepath, src);
      log.silly('\t found asset', start + ' ' + filepath);
      var asset = {
        type: pattern.type !== 'unknown' && pattern.type || _detectFileType(filepath),
        relative: pattern.relative,
        start: start,
        end: end,
        filepath: filepath
      };
      if (_.isFunction(pattern.outFilter)) { asset.outFilter = pattern.outFilter; }
      all.push(asset);
    }

    return raw;
  });

  return all;
};

/**
 * 查找当前文件所引用的其它资源
 * @returns {Array}
 */
File.prototype.findAssets = function() {
  var pts = patterns[this.type] || [];

  if (!pts.length) { return []; }

  var file = this;

  // 如果是 JS 或 JSON 文件，则相对路径是调用它文件的目录，CSS 和 HTML 文件中的资源都是相对于此文件本身的
  var relativeDirs = [file.dirname];
  if (_.contains([TYPE.JSON, TYPE.JS], file.type) && file.callers.length) {
    file.callers.forEach(function(f) { relativeDirs.unshift(f.dirname); });
  }

  log.verbose('Finding assets in ' + file.type + ' file', file.path + ' ...');

  var result = pts.reduce(function(all, pattern) {

    return all.concat(file._getAssetsFromPattern(pattern, relativeDirs));

  }, []);

  log.verbose(' found assets', _.map(result, function(it) { return [it.start, it.filepath];}));
  return result;
};

/**
 * 添加 file 到 {@link File#callers}
 * @param {File} file
 * @returns {Boolean}
 */
File.prototype.addCaller = function(file) {
  return _.contains(this.callers, file) ? false : this.callers.push(file);
};

/**
 * 添加 asset 到 {@link File#assets}
 * @param {Object}  asset
 * @param {File.TYPE} asset.type
 * @param {Integer}   asset.start
 * @param {Integer}   asset.end
 * @param {String}    asset.filepath
 * @param {Boolean}   asset.relative
 * @param {Function}  asset.outFilter - Come from {@link patterns} item's outFilter
 */
File.prototype.addAsset = function(asset) {
  this.assets.push(asset);
};


/**
 * 调用 uploader 上传所有文件
 * @param {Uploader} uploader
 * @param {Object} opts
 * @param {Function} cb
 * @private
 */
function _upload(uploader, opts, cb) {
  var files = _.filter(_.values(MAP), function(file) { return !_.includes(OPTS.inspectOnly, file.path); });
  log.info('You have ' + files.length + ' files need upload, the max concurrent number is ' + opts.eachUploadLimit);

  if (uploader.enableBatchUpload) {
    uploader.batchUploadFiles(files, cb);
  } else {
    async.eachLimit(files, opts.eachUploadLimit, function (file, next) {
      log.info('Start uploading ...', file.path);
      uploader.uploadFile(file, function(err) {
        if (err) {
          err.file = file.path;
        } else {
          log.info('  end uploaded', file.path);
        }
        next(err);
      });
    }, cb);
  }
}

/**
 * for File.inspect
 *
 * @param {Array} files
 * @param {File} caller
 * @private
 */
function _inspect (files, caller) {
  files.forEach(function(f) {
    var opts = {};

    // f 可能是 asset
    if (f.filepath) {
      opts.type = f.type;
      f = f.filepath;
    }

    if (!MAP[f]) {
      var file = new File(f, opts);
      MAP[f] = file;

      if (caller) { file.addCaller(caller); }

      if (!_.includes(OPTS.unbrokenFiles, file.path)) {
        var assets = file.findAssets();

        assets.forEach(file.addAsset.bind(file));

        _inspect(assets, file);
      }
    }
  });
}


var _rHost = /^((?:\w+:)?\/\/[^\/]+)/;
/**
 * 得到相对 url 路径
 * @param {String} ref
 * @param {String} target
 * @returns {String}
 * @private
 */
function _getRelativePath(ref, target) {
  // 首先两个地址的域名要相同
  var host;
  _rHost.test(ref);
  host = RegExp.$1;
  _rHost.test(target);
  if (host && host === RegExp.$1) {
    return path.relative(path.dirname(ref.substr(host.length)), target.substr(host.length));
  }

  return target;
}

/**
 * 更新文件的引用
 *
 * @private
 */
function _update () {
  if (OPTS.outDir) {
    mkdirp(OPTS.outDir);
    rm(OPTS.outDir);
    log.info('Empty out dir', OPTS.outDir);
  }

  _.each(MAP, function(file) {
    if (file.assets.length) {
      var useRelativeAssetPath = !_.includes(OPTS.useAbsoluteRefFiles, file.path);
      file.content = alter(file.content, file.assets.map(function(asset) {
        var str = MAP[asset.filepath].remote.path;
        if (asset.outFilter) { str = asset.outFilter(str); }

        if (asset.relative && useRelativeAssetPath) {
          str = _getRelativePath(file.remote.path, str);
        }

        return {start: asset.start, end: asset.end, str: str};
      }));
    }

    if (OPTS.outDir) {
      var dir = path.join(OPTS.outDir, path.dirname(file.remote.path.replace(_rHost, '').substr(1))),
        filepath = path.join(dir, file.remote.basename);
      mkdirp(dir);
      log.info('Write to file', filepath);
      fs.writeFileSync(filepath, file.content);
    }
  });
}

/**
 * 分析文件并上传文件
 *
 * @param {Array} files - 所有需要分析的文件
 * @param {Object} daOpts - 从 {@link da} 传过来的配置项
 * @param {Function} cb - 文件上传后的回调函数
 */
File.inspect = function(files, daOpts, cb) {
  OPTS = daOpts;
  MAP = {};

  try {
    log.profiler('da', 'inspect start');
    _inspect(files);
    log.profiler('da', 'inspect end');

    var uploader = Uploader.instance(daOpts.uploader, daOpts.uploaderOptions);

    log.profiler('da', 'update local files start');
    _.each(MAP, function(file) {
      uploader.setFileRemotePath(file);
      file.remote.basename = path.basename(file.remote.path);
    });
    _update();
    log.profiler('da', 'update local files end');

    if (!daOpts.dry) {
      log.profiler('da', 'upload to remote start');
      _upload(uploader, daOpts, function(err) {
        log.profiler('da', 'upload to remote end');
        cb(err, MAP);
      });
    } else {
      cb(null, MAP);
    }

  } catch (err) { cb(err); }
};


File.TYPE = TYPE;

module.exports = File;
