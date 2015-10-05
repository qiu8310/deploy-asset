'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _ylog = require('ylog');

var _ylog2 = _interopRequireDefault(_ylog);

var _depJs = require('dep.js');

var _depJs2 = _interopRequireDefault(_depJs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _util = require('../util');

var _util2 = _interopRequireDefault(_util);

var _File = require('../File');

var _File2 = _interopRequireDefault(_File);

exports['default'] = function (files, opts, next) {

  _util2['default'].banner('开始替换');
  var resolvedFiles = [];
  var retrieveRemoteUrlAfterUploaded = opts.uploader && opts.uploader.retrieveRemoteUrlAfterUploaded;

  try {
    (function () {

      var replace = function replace(file, updateRemote) {

        if (file.type === _File2['default'].STATIC_TYPE) {
          if (updateRemote) file.updateRemote();
          return true;
        }

        _ylog2['default'].info.title('开始替换文件 ^%s^ ...', file.relativePath);

        var assets = file.replace();
        if (updateRemote) file.updateRemote();

        assets.forEach(function (a) {
          _ylog2['default'].verbose('   使用 ^%s^ 替换了 &%s& ； *引用处: %s*', a.target, a.src, a.raw);
        });
        _ylog2['default'].info.writeOk('共替换 ^%s^ 处静态资源', assets.length);
        _ylog2['default'].info.writeOk('生成远程链接 ^%s^', file.remote.url).ln();
      };

      var resetFilesDepends = function resetFilesDepends(ignores) {
        files.forEach(function (file) {
          file.deepDepends = null;
          if (ignores) {
            file.depends = _lodash2['default'].difference(file.depends, ignores);
          } else {
            file.depends = _lodash2['default'].uniq(file.assets.map(function (a) {
              return a.filePath;
            }));
          }
        });
      };
      var getFilePathFromError = function getFilePathFromError(err) {
        return err.message.replace('Cycle depend on ', '');
      };

      var resolve = function resolve(file) {
        if (!(file instanceof _File2['default'])) file = _File2['default'].findFileInRefs(file);

        if (resolvedFiles.indexOf(file) >= 0) return false;
        resolvedFiles.push(file);

        file.deepDepends.forEach(resolve);

        replace(file, true);
      };

      var dependsCheck = function dependsCheck() {
        resetFilesDepends();
        var hasDepends = true,
            dependFile = undefined;

        if (opts.ignoreDependsError && !retrieveRemoteUrlAfterUploaded) {
          while (hasDepends) {
            if (hasDepends instanceof Error) {
              dependFile = getFilePathFromError(hasDepends);

              _ylog2['default'].color('yellow').warn('发现有多个文件循环依赖于 ^%s^', dependFile).ln.warn('由于开启了 ~ignoreDependsError~ ，所以此文件的 hash 值是根据本地文件的内容来计算的').ln();

              _File2['default'].findFileInRefs(dependFile).updateRemote();
              resetFilesDepends([dependFile]);
            }
            try {
              hasDepends = false;(0, _depJs2['default'])(files);
            } catch (e) {
              hasDepends = e;
            }
          }
        } else {
          try {
            (0, _depJs2['default'])(files);
          } catch (e) {
            dependFile = getFilePathFromError(e);

            var note = retrieveRemoteUrlAfterUploaded ? '文件上传后才能知道它的远程链接，所以无法启用 ~ignoreDependsError~ ' : '可以开启 ~ignoreDependsError~ 来忽略此错误';

            _ylog2['default'].color('red').error('发现有多个文件循环依赖于 ^%s^', dependFile).ln.error(note).ln();

            throw new Error('DEPENDS_ERROR');
          }
        }
      };

      // 只有三种情况才需要对文件进行排序：
      // 1. 指定了 dependsCheck
      // 2. 需要根据远程文件内容来计算文件的 hash 值
      // 3. 文件的链接是在上传完后才能知道，这样就需要先上传无依赖的文件，并且这种情况下有循环依赖时无法 ignore
      if (opts.dependsCheck || opts.hash && opts.hash > 0 && opts.hashSource === 'remote' || retrieveRemoteUrlAfterUploaded) {

        _ylog2['default'].info.title('检查是否有循环依赖的情况 ...');
        dependsCheck();
        _ylog2['default'].info.writeOk('循环依赖检查完成').ln();

        files.forEach(resolve);
      } else {
        files.forEach(function (file) {
          return file.updateRemote();
        });
        files.forEach(replace);
      }

      next(null, resolvedFiles.length ? resolvedFiles : files, opts);
    })();
  } catch (e) {
    return next(e);
  }
};

module.exports = exports['default'];