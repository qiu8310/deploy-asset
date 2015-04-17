/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var da = require('../');
var assert = require('should');
var path = require('path');
var qiniu = require('qiniu');
var sinon = require('sinon');

require('npmlog').level = 'silent';

describe('uploader', function() {

  var root = path.join(__dirname, 'fixtures', 'basic');
  var rm = require('rimraf').sync;

  it('should throws when not found uploader', function(done) {
    da(root, {uploader: 'custom'}, function(err) {
      assert.ok(err);
      done();
    })
  });

  context('base uploader', function() {
    it('should exists but can throws when called', function () {
      var up = new da.Uploader();
      assert(up.uploadFile);
      assert(up.batchUploadFiles);
      assert(up.setFileRemotePath);

      assert.throws(up.uploadFile);
      assert.throws(up.batchUploadFiles);
      assert.throws(up.setFileRemotePath);
    });
  });

  context('qiniu uploader', function() {
    it('should throws when missing config', function() {
      assert.throws(function() {
        da(root, {uploaderOptions: {ak: 'abc'}});
      });
    });

    it('should call upload', function(done) {
      var count = 0;
      var stub = sinon.stub(qiniu.io, 'put', function(token, basename, content, extra, cb) {
        count++;
        cb();
      });
      da(root, '*/*.{css,js}', {logLevel: 'silent'}, function() {
        stub.restore();
        count.should.eql(2);
        done();
      })
    });
  });

  context('custom uploader', function() {
    before(function() {
      da.Uploader.register('tu', da.Uploader.extend({
        setFileRemotePath: function(file) { file.remote.path = 'http://test.com/x.js'; },
        uploadFile: function(file, cb) { cb(/css$/.test(file.path) ? new Error('test') : null); }
      }));
    });

    it('should upload error when file is css file', function(done) {
      da(root, '*/*.css', {uploader: 'tu', dry: false}, function(err) {
        err.message.should.eql('test');
        done();
      });
    });

    it('should not trigger error when no file need to uploader', function(done) {
      da(root, '*.css', {uploader: 'tu', dry: true, logLevel: 'silent'}, function(err) {
        assert.ok(!err);
        done();
      });

      assert.doesNotThrow(function() {
        da(root, '*.css', {uploader: 'tu', dry: true, logLevel: 'silent'});
      });
    });

    it('should upload success when file is not css file', function(done) {
      da(root, '*/*.js', {uploader: 'tu', dry: false, logLevel: 'silent'}, function(err, all) {
        assert.ok(!err);
        assert.ok('scripts/main.js' in all);
        all['scripts/main.js'].remote.path.should.eql('http://test.com/x.js');
        rm('./public');
        done();
      });
    });
  });

  context('batch uploader', function() {
    var spy;
    before(function() {
      da.Uploader.register('bu', da.Uploader.extend({
        constructor: function() { this.enableBatchUpload = true; },
        setFileRemotePath: function(file) { file.remote.path = 'http://test.com/x.js'; },
        batchUploadFiles: function(files, cb) { spy(files); cb(); }
      }));
    });

    it('should call batchUploadFiles', function(done) {
      spy = sinon.spy();
      da(root, {uploader: 'bu'}, function() {
        assert(spy.called);
        rm('./public');
        done();
      });
    });
  });
});