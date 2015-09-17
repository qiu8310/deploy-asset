/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';

var da = require('../');
var assert = require('should'),
  sinon = require('sinon'),
  fs = require('fs'),
  File = require('../src/file'),
  rm = require('rimraf').sync,
  glob = require('glob').sync,
  path = require('path');

describe('deployAsset', function () {
  var root = path.join(__dirname, 'fixtures'),
    basicRoot = path.join(root, 'basic'),
    absRoot = path.join(root, 'abs'),
    errorRoot = path.join(root, 'error');

  context('arguments check', function() {
    var mock, ept;
    beforeEach(function() {
      process.chdir(basicRoot);
      mock = sinon.mock(File);
      ept = mock.expects('inspect');
    });
    afterEach(function() {
      mock.restore();
      process.chdir(path.dirname(__dirname));
    });

    it('should throws if not match (String, [String|Array], [Object], [Function])', function() {
      assert.throws(function() { da(basicRoot, true); });
      assert.throws(function() { da(basicRoot, 1); });
      assert.throws(function() { da(basicRoot, '*.x', 1); });
      assert.throws(function() { da(basicRoot, '*.x', {}, true); });
      assert.throws(function() { da(basicRoot, '*.x', function() {}, true); });

      ept.exactly(4);
      da(basicRoot);
      da(basicRoot, '*.html');
      da(basicRoot, ['*.html'], {});
      da(basicRoot, ['*/*.js'], {}, function() {});
    });

    it('should throws if not specify js,css,json,html extensions', function() {
      assert.throws(function() { da(basicRoot, {jsExts: ''}); });
      assert.throws(function() { da(basicRoot, {cssExts: ''}); });
      assert.throws(function() { da(basicRoot, {jsonExts: ''}); });
      assert.throws(function() { da(basicRoot, {htmlExts: ''}); });

      ept.exactly(1);
      da(basicRoot, {htmlExts: 'html'});
    });

    it('should throws if opts.deep less then 0', function() {
      assert.throws(function() { da(basicRoot, {deep: -1}); });
      assert.throws(function() { da(basicRoot, {deep: -2}); });

      ept.once();
      da(basicRoot, {deep: 1});
    });

    it('should throws if opts.rename less then -1', function() {
      assert.throws(function() { da(basicRoot, {rename: -3}); });
      assert.throws(function() { da(basicRoot, {rename: -2}); });

      ept.once();
      da(basicRoot, {rename: 1});
    });

    context('opts.excludes', function() {
      it('should excludes nothing', function() {
        ept.twice();
        ept.withArgs(['index.html', 'scripts/main.js']);
        da(basicRoot, '{*.html,*/*.js}');
        da(basicRoot, '{*.html,*/*.js}', {excludes: null});
      });

      it('should excludes html file', function() {
        ept.withArgs(['scripts/main.js']);
        da(basicRoot, '{*.html,*/*.js}', {excludes: '*.html'});
      });
    });

    context('opts.deep', function() {

      it('should inspect all current and it\'s sub dir html files when deep is true', function() {
        ept.withArgs(glob('{*.html,**/*.html}'));
        da(basicRoot, {deep: true});
      });

      it('should inspect current dir when deep is false or 0', function() {
        ept.exactly(2);

        ept.withArgs(glob('*.html'));
        da(basicRoot, {deep: 0});
        da(basicRoot, {deep: false});
      });

      it('should inspect specified deep of dir when deep is lager than 0', function() {
        ept.exactly(2);
        ept.withArgs(glob('{*.html,*/*.html}'));
        da(basicRoot, {deep: 1});

        ept.withArgs(glob('{*.html,*/*.html,*/*/*.html}'));
        da(basicRoot, {deep: 2});
      });

      it('should not work when specified globPatterns', function() {
        ept.withArgs(glob('*.html'));
        da(basicRoot, '*.html', {deep: 1});
      });

    });

  });

  context('basic deploy - opts.outDir', function() {

    it('should not deploy to local if outDir is false', function(done) {
      da(basicRoot, '*.html', {dry: true, outDir: false, logLevel: 'silent'}, function() {
        glob('./public/{*.*,*/*.*}').should.have.length(0);
        done();
      });
    });
    it('should deploy to specified dir', function(done) {
      da(basicRoot, '*.html', {dry: true, outDir: '../tmp', logLevel: 'silent'}, function() {
        glob('../tmp/{*.*,*/*.*}').should.have.length(4); // 生成 4 个文件
        rm('../tmp');
        done();
      });
    });

  });

  context('basic deploy - opts.rename', function() {

    it('should totally use hash chars to rename file name', function(done) {
      da(basicRoot, '*/*.js', {dry: true, rename: 0, outDir: 'public', logLevel: 'silent'}, function() {
        var rtn = glob('./public/{*.*,*/*.*}');
        rtn.should.have.length(1);
        assert(/^\w{32}\.js$/.test(rtn[0]));
        rm('./public');
        done();
      });
    });

    it('should append specified number chars to file', function(done) {
      da(basicRoot, '*/*.js', {dry: true, rename: 4, outDir: 'public', logLevel: 'silent'}, function() {
        var rtn = glob('./public/{*.*,*/*.*}');
        rtn.should.have.length(1);
        assert(/^\w\/\w-\w{4}\.js$/.test(rtn[0]));
        rm('./public');
        done();
      });
    });

    it('should support function to return new file name', function(done) {
      var rename = function(oldBasename, path, content) {
        oldBasename.should.eql('main.js');
        path.should.eql('scripts/main.js');
        content.toString().should.eql(fs.readFileSync('scripts/main.js').toString());
        return 'a.js';
      };
      da(basicRoot, '*/*.js', {dry: true, rename: rename, outDir: 'public', logLevel: 'silent'}, function() {
        var rtn = glob('./public/{*.*,*/*.*}');
        rtn.should.have.length(1);
        assert(/^\w\/a.js$/.test(rtn[0]));
        rm('./public');
        done();
      });
    });

    it('should use default value 8 if function return null', function(done) {
      da(basicRoot, '*/*.js', {dry: true, rename: function() {}, outDir: 'public', logLevel: 'silent'}, function() {
        var rtn = glob('./public/{*.*,*/*.*}');
        rtn.should.have.length(1);
        assert(/^\w\/\w-\w{8}\.js$/.test(rtn[0]));
        rm('./public');
        done();
      });
    });

  });

  context('basic deploy - opts.useAbsoluteRefFiles', function() {
    it('should use relative path default', function(done) {
      da(absRoot, '*.css', {logLevel: 'silent', dry: true, outDir: 'public', rename: function(o) { return o; }}, function(err) {
        var files = glob('public/*.*');
        files.length.should.eql(2);
        assert(/"t\.txt"/.test(fs.readFileSync('public/c.css')));
        rm('public');
        done(err);
      });
    });
    it('should use absolute path when specified in useAbsoluteRefFiles', function(done) {
      da(absRoot, 'c.css',
        {
          logLevel: 'silent', dry: true, outDir: 'public',
          useAbsoluteRefFiles: '*.css',
          rename: function(o) { return o; }
        },
        function(err) {
          var files = glob('public/*.*');
          files.length.should.eql(2);
          assert(!/"t\.txt"/.test(fs.readFileSync('public/c.css')));
          rm('public');
          done(err);
      });
    });
  });

  context('basic deploy - opts.unbrokenFiles', function() {
    it('should not inspect assets in unbrokenFiles', function(done) {
      da(basicRoot, '*.html', {dry: true, unbrokenFiles: '*.html', outDir: 'public', logLevel: 'silent'}, function() {
        var rtn = glob('./public/{*.*,*/*.*}');
        rtn.should.have.length(1);
        fs.readFileSync(rtn[0]).toString().should.eql(fs.readFileSync('index.html').toString());
        rm('./public');
        done();
      });
    });
  });

  context('deploy error', function() {
    it('should throws when found asset that should exists bug not', function(done) {
      da(errorRoot, {logLevel: 'silent'}, function(err, all) {
        assert.ok(err);
        done();
      });
    });

    it('should throws when error trigger bug no callback', function() {
      assert.throws(function() {
        da(errorRoot, {logLevel: 'silent'});
      });
    });

    it('should not throws when force it to proceed', function(done) {
      da(errorRoot, {force: true, dry: true, logLevel: 'silent'}, function(err, all) {
        assert.ok(all);
        done();
      });
    });
  });

});
