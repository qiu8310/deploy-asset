/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var log = require('npmlog'),
  mime = require('mime'),
  request = require('request');

var Uploader = require('../uploader');


module.exports = Uploader.extend({
  /**
   * init
   * @param {Object} opts
   * @private
   */
  constructor: function (opts) {
    if (!opts.auth || !opts.auth.url || !opts.auth.email || !opts.auth.password) {
      throw new Error('Need config {auth : { url: ..., email: ..., password: ... }}');
    }

    if (!opts.fetchTokenUrl) {
      throw new Error('Need config fetchTokenUrl');
    }

    if (!opts.base) {
      throw new Error('Need config domain');
    }

    this.auth = opts.auth;
    this.fetchTokenUrl = opts.fetchTokenUrl;
    this.base = opts.base;
  },


  /**
   * Set remote file path
   * @param {File} file
   * @private
   */
  setFileRemotePath: function(file) {
    file.remote.path = this.base + file.remote.basename;
  },

  /**
   *
   * @param {Function} cb
   * @private
   */
  _getAuthToken: function(cb) {
    var self = this;
    var form = {
      email: this.auth.email,
      password: this.auth.password
    };
    request.post({url: this.auth.url, form: form}, function(err, res, body) {
      if (err) {
        cb(err);
      } else {
        var data = JSON.parse(body);
        self.authToken = data.token;
        log.http('Auth token', data.token);
        cb(null, data.token);
      }
    });
  },

  /**
   * Upload file
   * @param {File} file
   * @param {Function} cb
   * @private
   */
  _upload: function(file, cb) {
    var formData = {
      token: '',
      file: {
        value:  file.content,
        options: {
          filename: file.basename,
          contentType: mime.lookup(file.path)
        }
      },
      key: file.remote.basename
    };
    var fetchTokenUrl = this.fetchTokenUrl + this.authToken;

    log.http('Fetch token', file.path);
    request.post({url: fetchTokenUrl}, function(err, res, body) {

      if (err) { return cb(err); }

      var data = JSON.parse(body);
      formData.token = data.uploadToken;
      log.http('Upload', file.path);
      request.post({url: 'http://up.qiniu.com/', formData: formData}, function(err, res, body) {
        if (err) { return cb(err); }
        log.http('Upload finish', file.path);
        try {
          body = JSON.parse(body);
        } catch (e) {}
        cb(null, body);
      });
    });
  },

  /**
   * Upload file
   * @param {File} file
   * @param {UploaderCallback} cb
   */
  uploadFile: function(file, cb) {
    var self = this;
    if (!this.authToken) {
      self._getAuthToken(function() {
        self._upload(file, cb);
      });
    } else {
      self._upload(file, cb);
    }
  }
});


