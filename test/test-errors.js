import util from './lib/util';
import _ from 'lodash';
import async from 'async';

let {assert, da} = util;
/*


 系统错误：

 指定的 rootDir 不存在，那么程序在运行 process.chdir(rootDir) 时会报错



 */

describe('DAErrors', () => {

  let ONLY, TYPE, INDEX;

  //ONLY = 'DEPEND_ASSET_NOT_UPLOAD';
  //TYPE = 'errors';
  //INDEX = 1;

  let errors = {
    ANY_ARGUMENT_ERROR: {
      msg: 'da 的第一个参数只支持 String 和 Array<String>',
      errors: [
        {any: true},
        {any: 4566},
        {any: ['abc', 1234]}
      ]
    },

    STEP_NOT_FOUND: {
      msg: '指定的 runToStep 不存在',
      errors: [
        {runToStep: 'no-exists'},
        {runToStep: 'ksjfk'}
      ],
      ok: [
        {runToStep: 'init'}
      ]
    },

    //NO_SPECIFY_BASE_URL: {
    //  msg: '没有指定 baseUrl 参数',
    //  errors: [
    //    {runToStep: 'init', noBaseUrl: true}
    //  ],
    //  ok: [
    //    {runToStep: 'init'}
    //  ]
    //},

    OVERWRITE_AND_DIFF_CONFLICT: {
      msg: '不能同时指定 overwrite 和 conflict',
      errors: [
        {runToStep: 'init', overwrite: true, diff: true}
      ],
      oks: [
        {runToStep: 'init', overwrite: true, diff: false},
        {runToStep: 'init', overwrite: false, diff: true},
        {runToStep: 'init', overwrite: false, diff: false}
      ]
    },

    NO_FILES: {
      msg: '根据指定的 any 参数，没有找到任何的文件',
      errors: [
        {any: 'basic/no-file.js'},
        {any: 'no-dir'},
        {any: 'basic/*.xx'}
      ],
      oks: [
        {any: 'basic/*.html'}
      ]
    },

    FILE_NOT_IN_ROOT_DIR: {
      msg: '文件不在指定的根目录内',
      errors: [
        {any: 'basic/*.*', rootDir: util.f('basic/d')},
        {any: 'basic/**/*.*', rootDir: util.f('basic/d/e')}
      ],
      oks: [
        {any: 'basic/d/*.*', rootDir: util.f('basic/d')},
        {any: 'basic/d/e/*.*', rootDir: util.f('basic/d/e')}
      ]
    },

    NO_FILE_AFTER_FILTER: {
      msg: '过滤后没有任何文件',
      errors: [
        {any: 'basic/*.json', includePatterns: '*.html'},
        {any: 'basic/*.html', noIncludePatterns: '*.html'}
      ],
      oks: [
        {any: 'basic/*.json', includePatterns: '*.json'}
      ]
    },

    UPLOADER_NOT_FOUND: {
      msg: '指定的 uploader 不存在',
      errors: [
        {uploaderName: 'adf'},
        {uploaderName: 'ced'}
      ],
      oks: [
        {uploaderName: 'qiniu', runToStep: 'init'}
      ]
    },

    UPLOADER_CONFIG_ERROR: {
      msg: 'uploader 配置错误',
      errors: [
        {uploaderName: 'qiniu', uploaderOpts: {ak: 'ak', sk: 'sk'}},
        {uploaderName: 'upyun', uploaderOpts: {operator: 'ak', password: 'sk'}}
      ]
    },

    NONE_ASSET: {
      msg: '找不到指定的文件',
      errors: [
        {any: 'errors/none-asset.html'}
      ],
      oks: [
        {any: 'errors/none-asset.html', ignoreNoneAssetError: true}
      ]
    },


    NO_OUT_DIR_FOR_FILE: {
      msg: '要为没有上传的但确有依赖的文件指定 outDir',
      errors: [
        {any: 'basic/index.html', noUploadPatterns: '*.html'},
        {any: 'basic/index.html', noUploadPatterns: '**/*.css'}
      ]
    },

    DEPEND_ASSET_NOT_UPLOAD: {
      msg: '要上传的文件依赖了没有上传的文件',
      errors: [
        {any: 'basic/index.html', noUploadPatterns: '**/*.gif'}
      ]
    },

    DEPENDS_ERROR: {
      msg: '有循环依赖，只有设定了 hash 才能触发去检查循环依赖',
      errors: [
        {any: 'depends/1.html', hash: 2},
        {any: 'depends/2-a.html', hash: 2},
        {any: 'depends/2-b.html', hash: 2},
        {any: 'depends/3-a.html', hash: 2},
        {any: 'depends/3-b.html', hash: 2},
        {any: 'depends/3-c.html', hash: 2},
        {any: 'depends/double-a.html', hash: 2}
      ],
      oks: [
        {any: 'depends/1.html', ignoreDependsError: true},
        {any: 'depends/1.html', hash: 3, ignoreDependsError: true},
        {any: 'depends/2-a.html', hash: 3, ignoreDependsError: true},
        {any: 'depends/2-a.html'},
        {any: 'depends/3-a.html'}
      ]
    },

    REMOTE_FILE_EXISTS: {
      msg: '远程文件已经存在了',
      errors: [
        {uploaderName: 'mock', uploaderOpts: {hooks: {
          isRemoteFileExists: () => true
        }}}
      ],
      oks: [
        {uploaderName: 'mock', ignoreExistsError: true, uploaderOpts: {hooks: {
          isRemoteFileExists: () => true
        }}}
      ]
    },

    REMOTE_FILE_CONFLICT: {
      msg: '和远程文件冲突',
      errors: [
        {uploaderName: 'mock', diff: true, uploaderOpts: {hooks: {
          isRemoteFileExists: () => true
        }}}
      ],
      oks: [
        {uploaderName: 'mock', diff: true, ignoreConflictError: true, uploaderOpts: {hooks: {
          isRemoteFileExists: () => true
        }}}
      ]
    },

    UPLOAD_ERROR: {
      msg: '上传出现失败',
      errors: [
        {uploaderName: 'mock', uploaderOpts: {hooks: {
          uploadFile: () => { throw new Error('x'); }
        }}}
      ],
      oks: [
        {uploaderName: 'mock', ignoreUploadError: true, uploaderOpts: {hooks: {
          uploadFile: () => { throw new Error('x'); }
        }}}
      ]
    }
  };


  _.each(errors, (obj, key) => {

    (ONLY === key ? it.only.bind(it) : it)(key + (obj.msg ? ': ' + obj.msg : ''), (done) => {

      obj.errors = obj.errors ? [].concat(obj.errors) : [];
      obj.oks = obj.oks ? [].concat(obj.oks) : [];

      let testOptsGroup = [];
      if (ONLY) {
        if (TYPE) testOptsGroup = obj[TYPE];
        else testOptsGroup = obj.errors.concat(obj.oks);

        if (_.isNumber(INDEX) && testOptsGroup[INDEX])
          testOptsGroup = [testOptsGroup[INDEX]];
      } else {
        testOptsGroup = obj.errors.concat(obj.oks);
      }

      console.log('    #%s  测试用例数量：', key, testOptsGroup.length);

      async.eachSeries(testOptsGroup, (testOpts, next) => {

        if (!testOpts.uploaderName) testOpts.uploaderName = 'mock';
        if (!testOpts.noBaseUrl) testOpts.baseUrl = 'b.cn';


        da(testOpts.any || 'basic', testOpts, (err, files, opts) => {

          let shouldError = obj.errors.indexOf(testOpts) >= 0;

          let testError = shouldError === !err || shouldError && err && err.message !== key;
          if (testError) {
            console.log('\n\n---------------------------------------\n');
            console.log(shouldError ? (!err ? '\t应该出错但没出错' : '') : (err ? '\t不应该出错但出错了' : ''));
            console.log(err && err.message !== key ? '\t错误应该是 ' + key + '，结果却是 ' + err.message : '');
            console.log('');
            console.log('TEST: %s, CASE: ', key, testOpts, '\n\n');
            delete opts.uploader;
            delete opts.DEFAULTS;
            console.log('RESULT_OPTS: ', opts);

            if (err && !(/^[A-Z_]*$/.test(err.message))) {
              console.log('\n\n\n');
              console.log(err.stack);
            }

            console.log('\n---------------------------------------\n');

            //assert.ok(shouldError ? err : !err);
            //if (err) err.message.should.eql(key);
          }

          next(testError ? new Error(key + ' test error') : null);
        });

      }, done);

    });

  });
});
