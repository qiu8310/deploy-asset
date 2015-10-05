'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _ylog = require('ylog');

var _ylog2 = _interopRequireDefault(_ylog);

var _util = require('../util');

var _util2 = _interopRequireDefault(_util);

exports['default'] = function (files, opts, done) {
  try {
    (function () {

      _util2['default'].banner('开始上传');

      var uploader = opts.uploader;
      _ylog2['default'].verbose('同时上传文件的个数为 ^%s^', opts.concurrence);

      var uploadingCount = 0;
      var uploadError = false;

      var upload = function upload(file, nextFile) {
        uploadingCount++;

        file.upload(function (err) {
          uploadingCount--;
          if (!uploadingCount) {
            _ylog2['default'].setLevel(opts.logLevel);
            if (uploadError) {
              done(uploadError, files);
              uploadError = false;
            }
          }
          nextFile(err);
        });
      };

      var finish = function finish(err) {
        if (err && uploadingCount) {
          uploadError = err;
          _ylog2['default'].setLevel('silent');
        } else {
          done(err, files);
        }
      };

      uploader.run(function (end) {
        return _async2['default'].eachLimit(files, opts.concurrence, upload, end);
      }, finish);
    })();
  } catch (e) {
    done(e);
  }
};

module.exports = exports['default'];