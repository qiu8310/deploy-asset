'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _ylog = require('ylog');

var _ylog2 = _interopRequireDefault(_ylog);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _xPath = require('x-path');

var _xPath2 = _interopRequireDefault(_xPath);

var _minAsset = require('min-asset');

var _minAsset2 = _interopRequireDefault(_minAsset);

var _prettyBytes = require('pretty-bytes');

var _prettyBytes2 = _interopRequireDefault(_prettyBytes);

var _util = require('../util');

var _util2 = _interopRequireDefault(_util);

var _File = require('../File');

var _File2 = _interopRequireDefault(_File);

function _getMinFileType(file) {
  if (file.type === _File2['default'].STATIC_TYPE) {
    if (_lodash2['default'].includes(['png', 'jpeg', 'jpg', 'gif', 'svg'], file.ext)) return 'image';
  } else {
    return file.type;
  }
}

function _compress(file, done) {
  var type = _getMinFileType(file);
  var minOpts = file.opts['min' + _lodash2['default'].capitalize(type)] || {};
  if (!type) return done(null, file);

  _ylog2['default'].info.title('开始压缩文件 ^%s^ ...', file.relativePath);
  (0, _minAsset2['default'])(file.content, type, minOpts, function (err, data) {

    if (err) return done(err);
    var oz = data.originalSize,
        mz = data.minifiedSize;
    var diff = oz - mz;
    var rate = (diff * 100 / oz).toFixed();
    if (diff > 10) {
      file.min = {};
      file.min.originalSize = oz;
      file.min.minifiedSize = mz;
      file.min.diffSize = diff;
      file.min.rate = rate;
      _ylog2['default'].info.writeOk('新文件 !%s! , 文件压缩了 ~%s~ , 压缩率 ~%s%~', (0, _prettyBytes2['default'])(mz), (0, _prettyBytes2['default'])(diff), rate).ln();
      file.remote.content = data.content;
    } else {
      _ylog2['default'].info.writeOk('*文件已经最小了，不需要压缩（改变压缩配置看看）*').ln();
    }
    done(null, file);
  });
}

function _inspect(file, done) {
  if (file.type === _File2['default'].STATIC_TYPE) return done(null, []);

  _ylog2['default'].info.title('开始检查文件 ^%s^ ...', file.relativePath);

  var assets = file.insp(file.opts.inspectFilter);

  assets.forEach(function (a) {
    _ylog2['default'].verbose('   资源 &%s-%s& : &%s&  *引用处: %s*', a.start, a.end, a.src, a.raw);
  });

  _ylog2['default'].info.writeOk('共找到 ^%s^ 处静态资源', assets.length).ln();

  done(null, file.resolveAssets());
}

exports['default'] = function (filePaths, opts, next) {

  _util2['default'].banner('资源检查' + (opts.min ? '(并压缩)' : ''));

  _File2['default'].refs = {}; // 先将引用清空
  var inspectedFiles = [];

  try {
    (function () {

      var getFile = function getFile(filePath) {
        var asset = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

        var file = _File2['default'].findFileInRefs(filePath);
        return file ? file : new _File2['default'](filePath, opts.rootDir, opts, asset);
      };

      var inspect = function inspect(file, done) {
        if (inspectedFiles.indexOf(file) >= 0) return done(null, []);
        inspectedFiles.push(file);

        if (opts.min) {
          _compress(file, function (err, file) {
            if (err) return done(err);
            _inspect(file, done);
          });
        } else {
          _inspect(file, done);
        }
      };

      var walk = function walk(files, done) {
        _async2['default'].eachSeries(files, function (file, next) {
          inspect(file, function (err, assets) {
            if (err) return done(err);
            walk(assets, next);
          });
        }, done);
      };

      var startFiles = filePaths.map(getFile);
      walk(startFiles, function (err) {
        if (err) return next(err);

        _ylog2['default'].verbose('检查后的文件 *%o*', inspectedFiles.map(function (file) {
          return file.relativePath;
        }));

        err = inspectedFiles.some(function (f) {
          if (!f.apply.upload && f.assets.length && f.apply.replace && !opts.outDir) {
            _ylog2['default'].error('文件 ^%s^ 指定为不要上传，同时也没有指定 ~outDir~ 参数', f.relativePath).ln().error('但此文件包含有其它静态资源，它里面的内容会被替换').ln().error('所以如果不上传此文件，请指定一个输出目录，将更新后的文件输出在指定的目录内');

            return true;
          }
        });

        if (err) next(new Error('NO_OUT_DIR_FOR_FILE'));else next(null, inspectedFiles, opts);
      });

      //outputFileTree(opts.rootDir, startFiles);
    })();
  } catch (e) {
    return next(e);
  }
};

/*
 basic
 ├── a.txt
 ├── j1.json
 └── j2.json
 │   └── a.txt
 └── index.html
 └── d/d.css
 │   └── c.gif
 └── b.js
 └── d/e/e.js

archy
 '│' : '|',
 '└' : '`',
 '├' : '+',
 '─' : '-',
 '┬' : '-'

 deploy-asset@1.0.0-alpha /Users/Mora/Workspace/node/deploy-asset
 ├─┬ alter@0.2.0
 │ └── stable@0.1.5
 ├── async@1.4.2


 └─┬ ylog@0.2.2
 ├─┬ are-we-there-yet@1.0.4
 │ ├── delegates@0.1.0
 │ └─┬ readable-stream@1.1.13
 │   ├── core-util-is@1.0.1
 │   ├── inherits@2.0.1
 │   ├── isarray@0.0.1
 │   └── string_decoder@0.10.31
 ├─┬ chalk@1.1.1
 │ ├── ansi-styles@2.1.0
 │ ├── escape-string-regexp@1.0.3
 │ ├─┬ has-ansi@2.0.0
 │ │ └── ansi-regex@2.0.0
 │ ├─┬ strip-ansi@3.0.0
 │ │ └── ansi-regex@2.0.0
 │ └── supports-color@2.0.0

 */
function outputFileTree(base, files) {}
module.exports = exports['default'];