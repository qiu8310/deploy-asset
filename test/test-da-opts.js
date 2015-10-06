/*eslint handle-callback-err: 0, eqeqeq: 0*/

import util from './lib/util';
import _ from 'lodash';
import async from 'async';
import os from 'os';
import crypto from 'crypto';
import File from '../src/File';

function md5(str, len = 100) {
  let md5 = crypto.createHash('md5');
  md5.update(str);
  return md5.digest('hex').substr(0, len);
}

let {assert, da} = util;

/*

 // 每个选项都要测试
 uploaderName
 uploaderOpts

 // 还未实现
 minify
 outDir
 outSuccess

 // 可以不测试
 stack
 logLevel
 */


describe('DAOpts', () => {

  util.daTest({
    '#rootDir': {
      '当第一个参数是目录时，就把它当作 rootDir': {
        any: 'basic/d/e',
        runToStep: 'init',
        cb(err, files, opts) {
          if (err) throw err;
          opts.rootDir.should.eql(util.f('basic/d/e'));
        }
      },

      '当第一个参数是文件或 globPatterns 时，自动取出这些文件的根目录': {
        tests: [
          {
            any: ['basic/a.txt', 'basic/d/d.css'],
            runToStep: 'init',
            cb(err, files, opts) {
              opts.rootDir.should.eql(util.f('basic'));
            }
          },
          {
            any: ['basic/d/*/*.*', 'basic/d/d.css'],
            cb(err, files, opts) {
              opts.rootDir.should.eql(util.f('basic/d'));
            }
          }
        ]
      },

      '当在 opts 中指定了 rootDir，则不管第一个参数是什么，都使用 opts 中的值': {
        tests: [
          {
            any: ['basic/a.txt', 'basic/d/d.css'],
            rootDir: util.testDir,
            runToStep: 'init',
            cb(err, files, opts) { opts.rootDir.should.eql(util.testDir); }
          },
          {
            any: ['basic/d/*/*.*', 'basic/d/d.css'],
            rootDir: util.fixturesDir,
            runToStep: 'init',
            cb(err, files, opts) { opts.rootDir.should.eql(util.fixturesDir); }
          }
        ]
      },

      '当查找到的文件不在 rootDir 中，应该抛出异常': {
        any: 'basic/a.txt',
        rootDir: util.f('depends'), runToStep: 'init',
        cb(err) {
          assert.ok(err);
          err.message.should.eql('FILE_NOT_IN_ROOT_DIR');
        }

      },
      '当指定的 rootDir 不是目录是，应该抛出异常': {
        any: 'basic/dddd',
        cb(err) {
          assert.ok(err);
        }
      }

    },

    '#flat': {
      '不应该扁平': {
        flat: false,
        cb: (err, files) => files.forEach(f => f.remote.relative.should.eql(f.relativeDir))
      },
      '应该将所有资源扁平': {
        flat: true,
        cb: (err, files) => files.forEach(f => f.remote.relative.should.eql(''))
      },
      '上传器可以强制指定 mustFlatAssets': {
        uploaderOpts: {hooks: {init: function() { this.mustFlatAssets = true; }}},
        cb(e, files) {
          files.forEach(f => f.remote.relative.should.eql(''));
        }
      }
    },

    '#concurrence': {
      '默认应该是 cpu 数量的两倍': {
        cb(e, f, opts) {
          opts.concurrence.should.eql(os.cpus().length * 2);
        }
      },
      '可以指定成任意值': {
        concurrence: 20,
        cb(e, f, opts) {
          opts.concurrence.should.eql(20);
        }
      },
      '受 uploader 的 maxConcurrentJobs 变量限制': {
        uploaderOpts: {hooks: {init: function() { this.maxConcurrentJobs = 2; }}},
        cb(e, f, opts) {
          opts.concurrence.should.eql(Math.min(os.cpus().length * 2, 2));
        }
      },
      '同时指定 concurrence 和 maxConcurrentJobs': {
        uploaderOpts: {hooks: {init: function() { this.maxConcurrentJobs = 10; }}},
        tests: [
          {
            concurrence: 20,
            cb(e, f, opts) {
              opts.concurrence.should.eql(10);
            }
          },
          {
            concurrence: 5,
            cb(e, f, opts) {
              opts.concurrence.should.eql(5);
            }
          }
        ]
      },
      '如果 uploader 指定了 retrieveRemoteUrlAfterUploaded，则 concurrence 一定是 1': {
        uploaderOpts: {hooks: {init: function() {
          this.maxConcurrentJobs = 10;
          this.retrieveRemoteUrlAfterUploaded = true;
        }}},
        tests: [
          {
            cb(e, f, opts) {
              opts.concurrence.should.eql(1);
            }
          },
          {
            concurrence: 5,
            cb(e, f, opts) {
              opts.concurrence.should.eql(1);
            }
          }
        ]
      }
    },

    '#destDir & env.getFileRemoteDir & env.getFileRemotePath': {
      '默认目录是 /，可以指定为其它目录': {
        uploaderName: 'mock',
        any: 'basic/a.txt',
        tests: [
          {_dd: '/', _rdd: '/', _rdf: '/a.txt'},
          {_dd: '', _rdd: '/', _rdf: '/a.txt', destDir: ''},
          {_dd: '/a/b', _rdd: '/a/b', _rdf: '/a/b/a.txt', destDir: '/a/b'},
          {_dd: 'a/b', _rdd: '/a/b', _rdf: '/a/b/a.txt', destDir: 'a/b'},
          {_dd: '/a/', _rdd: '/a', _rdf: '/a/a.txt', destDir: '/a/'},
          {_dd: 'a/', _rdd: '/a', _rdf: '/a/a.txt', destDir: 'a/'}
        ],
        cb(e, files, opts, ori) {
          let env = opts.env;
          let file = files[0];

          env.destDir.should.eql(ori._dd);
          files.length.should.eql(1);
          env.getFileRemoteDir(file).should.eql(ori._rdd);
          env.getFileRemoteDir(file, false).should.eql(ori._rdd.substr(1));

          env.getFileRemotePath(file).should.eql(ori._rdf);
          env.getFileRemotePath(file, false).should.eql(ori._rdf.substr(1));
        }
      }
    },
    '#baseUrl': {
      '可以设置域名，可以带 http，或不带': {
        uploaderName: 'mock',
        any: 'basic/a.txt',
        tests: [
          {baseUrl: 'a.c'},
          {baseUrl: 'a.c/'},
          {baseUrl: 'http://a.c'},
          {baseUrl: 'http://a.c/'}
        ],
        cb(e, files, opts, ori) {
          files[0].remote.url.should.eql('http://a.c/a.txt');
        }
      }
    },
    '#appendDestDirToBaseUrl': {
      '为 false': {
        uploaderName: 'mock',
        appendDestDirToBaseUrl: false,
        any: 'basic/a.txt',
        baseUrl: 'a.c',
        tests: [
          {destDir: ''},
          {destDir: 'a/'},
          {destDir: 'a/b/'}
        ],
        cb(e, files, opts, ori) {
          files[0].remote.url.should.eql('http://a.c/a.txt');
        }
      },

      '为 true': {
        uploaderName: 'mock',
        appendDestDirToBaseUrl: true,
        any: 'basic/a.txt',
        baseUrl: 'a.c',
        tests: [
          {destDir: ''},
          {destDir: 'a/'},
          {destDir: 'a/b/'}
        ],
        cb(e, files, opts, ori) {
          files[0].remote.url.should.eql('http://a.c/' + ori.destDir + 'a.txt');
        }
      }
    }
  });


  context('#hash, #prefix, #suffix, #rename, #hashPrefix, #hashSource', () => {
    it('默认不对 basename 做任何处理', (done) => {
      da('basic/a.txt', {}, (err, files, opts) => {
        files.length.should.eql(1);
        files[0].remote.basename.should.eql('a.txt');
        done();
      });
    });
    it('加 prefix', (done) => {
      da('basic/{a,j1}.*', {prefix: 'aa-'}, (err, files, opts) => {
        files.forEach(f => f.remote.basename.should.eql('aa-' + f.basename));
        done();
      });
    });
    it('加 suffix', (done) => {
      da('basic/j1.json', {suffix: 'xx'}, (err, files, opts) => {
        files.forEach(f => f.remote.basename.should.eql('j1xx.json'));
        done();
      });
    });
    it('加 hash', (done) => {
      da('basic/*.json', {hash: 10}, (err, files, opts) => {
        files.forEach(f => f.remote.basename.length.should.eql(f.basename.length + 11));

        da('basic/*.json', {hash: 2}, (err, files, opts) => {
          files.forEach(f => f.remote.basename.length.should.eql(f.basename.length + 3));
          done();
        });

      });
    });

    it('string rename', (done) => {
      da('basic/a.txt', {rename: '{p}--{n}--{s}'}, (err, files, opts) => {
        files.forEach(f => f.remote.basename.should.eql('--a--.txt'));

        da('basic/a.txt', {rename: '{p}--{n}--{s}', prefix: 'a'}, (err, files, opts) => {
          files.forEach(f => f.remote.basename.should.eql('a--a--.txt'));

          da('basic/a.txt', {rename: '{n}-{s}{p}c', prefix: 'a', suffix: 'b'}, (err, files, opts) => {
            files.forEach(f => f.remote.basename.should.eql('a-bac.txt'));

            done();
          });
        });
      });
    });
    it('function rename', (done) => {
      da('basic', {rename: (f) => f.name + '---'}, (err, files, opts) => {
        files.forEach(f => f.remote.basename.should.eql(f.name + '---' + f.extname));
        done();
      });
    });

    it('指定 hashPrefix', (done) => {
      da('basic/j1.json', {hashPrefix: '.', hash: 2}, (err, files, opts) => {
        files[0].remote.basename.should.match(/j1\.\w{2}\.json/);
        done();
      });
    });

    it('指定 hashSource', (done) => {
      da('basic/j2.json', {hashSource: 'remote', hash: 6}, (err, files) => {
        files.forEach(f => {
          f.remote.basename.should.eql(f.name + '-' + md5(f.remoteContentString, 6) + f.extname);
        });

        da('basic/j2.json', {hashSource: 'local', hash: 8}, (err, files) => {
          files.forEach(f => {
            f.remote.basename.should.eql(f.name + '-' + md5(f.contentString, 8) + f.extname);
          });
          done();
        });
      });
    });
  });

  context('#includePatterns vs #noIncludePatterns', () => {
    it('如果没有指定任何值，或指定 includePatterns 为 true ,或指定 noIncludePatterns 为 false ，则默认取所有找到的文件', (done) => {
      async.eachSeries(
        [{}, {includePatterns: true}, {noIncludePatterns: false}, {includePatterns: true, noIncludePatterns: false}],
        (opts, next) => {
          da(['basic/a.txt', 'basic/j1.json'], opts, (err, files, opts) => {
            assert.ok(!err);
            files.length.should.eql(2);
            next();
          });
        },
        done
      );
    });
    it('如果指定 includePatterns 为 false ,或指定 noIncludePatterns 为 true ，则不会取任何文件', (done) => {

      async.eachSeries(
        [{includePatterns: false}, {noIncludePatterns: true}, {includePatterns: false, noIncludePatterns: true}],
        (opts, next) => {
          da(['basic/a.txt', 'basic/j1.json'], opts, (err, files, opts) => {
            err.message.should.eql('NO_FILE_AFTER_FILTER');
            next();
          });
        },
        done
      );
    });
    it('其它情况，从 includePatterns 中过滤，再从 noIncludePatterns 中排除，得到剩下的文件', (done) => {
      da(['basic/a.txt', 'basic/j1.json'],
        {includePatterns: '*.txt'},
        (err, files, opts) => {
          assert.ok(!err);
          files.length.should.eql(1);
          files[0].basename.should.eql('a.txt');

          da(['basic/a.txt', 'basic/j1.json'],
            {includePatterns: '*.*', noIncludePatterns: '*.json'},
            (err, files, opts) => {
              assert.ok(!err);
              files.length.should.eql(1);
              files[0].basename.should.eql('a.txt');
              done();
            }
          );
        }
      );

    });
  });


  let hookOpts = {
    rename: {prefix: 'pre-'}
  };
  let hooks = {
    rename: (f, apply) => {
      if (apply) f.remote.basename.should.eql('pre-' + f.basename);
      else f.remote.basename.should.eql(f.basename);
    },
    upload: (f, apply) => {
      if (apply) f.status.uploaded.should.eql(apply);
      else assert.ok(f.status.uploaded === null);
    },
    replace: (f, apply) => {
      if (f.assets.length) f.contentString.should[apply ? 'not' : 'be'].eql(f.remoteContentString);
    },
    absolute: (f, apply) => {
      if (f.assets.length) {
        let index = f.remoteContentString.indexOf(f.opts.env.baseUrl);
        if (apply) index.should.aboveOrEqual(0);
        else index.should.below(0);
      }
    },
    inspect: (f, apply) => {
      if (!apply) f.assets.length.should.eql(0);
    }
  };

  'inspect, absolute, replace, upload, rename'.split(', ').forEach(k => {
  //'upload'.split(', ').forEach(k => {
    let wk = k + 'Patterns', bk = 'no' + _.capitalize(wk),
      fn, all;

    before(() => {
      fn = (opts, next) => {
        da('basic/index.html', _.assign({}, hookOpts[k], opts), (err, files) => {
          if (err) console.log(err.stack);
          assert.ok(!err);
          files.forEach(f => {
            let apply = typeof all === 'boolean' ? all : opts.ext === f.ext;
            assert.ok(f.apply[k] == apply);
            if (hooks[k]) hooks[k](f, apply);
          });
          next();
        });
      };
    });

    context(`#${wk} vs #${bk}`, () => {
      it(`如果没有指定任何值，或指定 ${wk} 为 true，或指定 ${bk} 为 false, file.apply.${k} 应该都为 true`, (done) => {
        all = true;
        async.eachSeries([
          {},
          {[wk]: true},
          {[bk]: false},
          {[wk]: true, [bk]: false}
        ], fn, done);
      });

      it(`指定 ${wk} 为 false，或指定 ${bk} 为 true, file.apply.${k} 应该都为 false`, (done) => {
        all = false;
        async.eachSeries([
          {[wk]: false},
          {[bk]: true},
          {[wk]: false, [bk]: true}
        ], fn, done);
      });

      it(`其它情况先，从 ${wk} 中过滤，再从 ${bk} 中排除，剩下的文件的 apply.${k} 值为 true ，否则为 false`, (done) => {
        all = null;
        //['index.html', 'd/d.css', 'b.js', 'd/e/e.js', 'c.gif'];

        var tests = [
          {[wk]: '*.html', ext: 'html'},
          {[bk]: ['index.html', '**/*.js', '*.*'], ext: 'css', outDir: 'out'},
          {[wk]: '**/*.js', [bk]: '*.{html,gif}', ext: 'js', outDir: 'out'},
          {[wk]: '**/*.gif', ext: 'gif', outDir: 'out'}
        ];

        // upload 会引发 DEPEND_ASSET_NOT_UPLOAD 错误
        if (k === 'upload') tests = [];

        async.eachSeries(tests, fn, done);

      });
    });
  });

  'html, json, css, js'.split(', ').forEach(k => {
    let ke = k + 'Extensions';
    context(`#${ke}`, () => {
      it('所有文件应该都是 ' + k, (done) => {
        da('basic/**/*.*', {[ke]: ['html', 'js', 'css', 'json', 'txt', 'gif']}, (err, files) => {
          files.forEach(f => f.type.should.eql(File[k.toUpperCase() + '_TYPE']));
          done();
        });
      });
    });
  });

});
