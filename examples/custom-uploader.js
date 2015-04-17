/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';

var da = require('../');

var fakeAsyncUpload = function() {};


var CustomUploader = da.Uploader.extend({
  constructor: function(opts) {
    this.opts = opts;
  },

  setFileRemotePath: function(file) {
    file.remote.path = this.opts.basePath + '/' + file.remote.basename;
  },

  uploadFile: function(file, cb) {
    fakeAsyncUpload(file.content, function(err) {
      cb(err);
    });
  }
});


da.Uploader.register('custom', CustomUploader);
