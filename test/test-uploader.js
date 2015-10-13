import da from '../src/da';
import FtpServer from 'ftp-test-server';
import async from 'async';
import fs from 'fs-extra';
import path from 'path';

import ServerEnv from '../src/ServerEnv';
import File from '../src/File';
import Uploader from '../src/uploaders/Uploader';

import util from './lib/util';

let ftpServer;
let {assert} = util;

let env;
let testFiles = [];


let hooks = {
  ftp: {
    uploaderOpts: {
      baseUrl: 'http://what.ever', // 这个不需要，但生成 ServerEnv 需要此值存在
      host: 'localhost',
      user: 'abc',
      pass: '1ksdjfk',
      port: 9472
    },
    before() {
      console.log('      在本地启动 ftp 服务器');
      ftpServer = new FtpServer();
      //ftpServer.on('stdout', data => ylog.fatal('ftp server', data));
      //ftpServer.on('stderr', data => console.log('ftp server', data.toString()));
      ftpServer.init(this.uploaderOpts);
    },
    after() {
      ftpServer.stop();
      console.log('      结束 ftp 服务器');
      fs.removeSync(path.join(__dirname, '..', env.destDir));
    }
  }
};

process.on('exit', (code) => {
  if (ftpServer) ftpServer.stop();
});

describe('Uploaders', () => {

  let allUploaderNames = ['qiniu', 'upyun'];
  //let allUploaderNames = ['github'];

  allUploaderNames.forEach(uploaderName => {
    context('#' + uploaderName, () => {
      let hook, uploader, testUploaderFn;

      let hasError; // 下面的 test 按顺序执行，有一个出异常了下面的就没必要执行

      before((done) => {
        hasError = false;
        hook = hooks[uploaderName] || {};

        if (hook.before) hook.before();
        uploader = Uploader.instance(uploaderName, hook.uploaderOpts || {}, env);

        uploader.opts.destDir = '__delete';
        if (!uploader.opts.baseUrl) uploader.opts.baseUrl = uploader.opts.domain;
        env = new ServerEnv(uploader.opts);
        uploader.env = env;

        let txtFile = new File(util.f('basic/a.txt'), util.f('basic'));
        let imgFile = new File(util.f('basic/c.gif'), util.f('basic'));

        [txtFile, imgFile].forEach((f, i) => {
          f.opts.env = env;
          f.remote.basename = 'file-' + Date.now() + f.extname; // 保证文件不存在
          f.remote.relative = i ? '' : 'path';
          f.updateRemoteUrl();
        });

        testFiles = uploaderName === 'github' ? [txtFile] : [txtFile, imgFile];

        uploader.initService(done);
      });

      after((done) => {
        uploader.destroyService(done);
        if (hook.after) hook.after();
      });

      testUploaderFn = (uploaderFnKey, label, cb, shouldThrows = false) => {
        it(label, (done) => {
          if (hasError) {
            if (hasError === true) console.log('\n      上面的步骤出现异常，所以此下的步骤都自动忽略');
            hasError = 1;
            return done();
          }
          async.eachSeries(testFiles, (file, next) => {
            uploader[uploaderFnKey](file, (err, rtn) => {
              if (err) {
                if (!shouldThrows) {
                  console.log('\n\t不应该抛出异常的，但确实出错了 (%s)：\n', file.basename);
                  console.log(err);
                  next(err);
                } else {
                  cb(file, err, next);
                }
              } else {
                if (shouldThrows) {
                  console.log('\n\t应该抛出异常的，但确实没有出错，执行结果是 (%s)：\n', file.basename);
                  console.log(rtn);
                  next(new Error('UNKNOWN'));
                } else {
                  cb(file, rtn, next);
                }
              }
            });
          }, (err) => {
            if (err) hasError = true;
            done(err);
          });
        });
      };

      testUploaderFn('isRemoteFileExists', '初始状态，文件不应该存在', (file, rtn, next) => {
        console.log('      远程文件链接：', file.remote.url);
        if (rtn) next(new Error('文件不应该存在'));
        else next();
      });

      testUploaderFn('removeRemoteFile', '文件不存在就去删除文件应该抛出异常', (file, err, next) => {
        //console.log('\t%s: %s', file.basename, err.message);
        next();
      }, true);

      testUploaderFn('getRemoteFileContent', '文件不存在就去获取文件内容应该抛出异常', (file, err, next) => {
        //console.log('\t%s: %s', file.basename, err.message);
        next();
      }, true);

      testUploaderFn('uploadFile', '上传文件', (file, rtn, next) => {
        //console.log('\t%s:', file.basename, rtn);
        next();
      });

      testUploaderFn('isRemoteFileExists', '上传完后文件应该存在', (file, rtn, next) => {
        if (rtn !== true) next(new Error('文件应该存在'));
        else next();
      });

      testUploaderFn('uploadFile', '文件存在再重新上传不应该出错', (file, rtn, next) => {
        //console.log('\t%s:', file.basename, rtn);
        next();
      });

      // 服务器没有这么块生成远程链接，所以这个步骤常常出错
      testUploaderFn('getRemoteFileContent', '远程文件的内容应该和本地一致', (file, rtn, next) => {
        if (file.remote.content.compare(rtn) !== 0) {
          next(new Error('远程文件的内容和本地不一致'));
        } else {
          next();
        }
      });

      testUploaderFn('removeRemoteFile', '删除刚上传文件', (file, rtn, next) => {
        next();
      });

      testUploaderFn('isRemoteFileExists', '删除后，文件不应该存在', (file, rtn, next) => {
        if (rtn) next(new Error('文件不应该存在'));
        else next();
      });


    });
  });



});
