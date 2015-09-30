/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

import Uploader from './Uploader';
import path from 'path';
import fs from 'fs-extra';

var FTP = require('jsftp-mkdirp')(require('jsftp'));

class FtpUploader extends Uploader {

  /**
   * @override
   * @borrows Uploader.initService
   */
  initService() {
    let opts = this.opts;
    this.ftp = new FTP({
      host: opts.host,
      user: opts.user,
      pass: opts.pass,
      port: opts.port
    });
  }

  /**
   * @override
   * @borrows Uploader.destroyService
   */
  destroyService(done) {
    this.ftp.raw.quit((err) => {
      if (err) this.log.error('FTP connection ended with error', err);
      done(err);
    });
  }

  /**
   * @override
   * @borrows Uploader.uploadFile
   */
  uploadFile(file, done) {
    this.ftp.mkdirp(this.env.getFileRemoteDir(file), (err) => {
      if (err) return done(err);
      this.ftp.put(file.remote.content, this.env.getFileRemotePath(file), done);
    });
  }

  /**
   * @override
   * @borrows Uploader.isRemoteFileExists
   */
  isRemoteFileExists(file, done) {
    this.ftp.ls(this.env.getFileRemotePath(file), (err, res) => {
      if (err) {
        if (err.code === 550) done(null, false);
        else done(err);
      } else {
        if (res && res.length === 1 && res[0].name === file.remote.basename) done(null, true);
        else done(new Error('UNKNOWN'));
      }
    });
  }


  /**
   * @override
   * @borrows Uploader.getRemoteFileContent
   */
  getRemoteFileContent(file, done) {
    let tmpFilePath = this.constructor.getLocalTmpFilePath();
    let clear = () => fs.removeSync(tmpFilePath);

    this.ftp.get(this.env.getFileRemotePath(file), tmpFilePath, err => {
      if (!err) {
        fs.readFile(tmpFilePath, (err, rtn) => {
          clear();
          done(err, rtn);
        });
      } else {
        clear();
        done(err);
      }
    });
  }


  /**
   * @override
   * @borrows Uploader.removeRemoteFile
   */
  removeRemoteFile(file, done) {
    this.ftp.raw.dele(this.env.getFileRemotePath(file), done);
  }
}


FtpUploader.config = {
  error: {
    host: 'FTP 域名',
    user: 'FTP 用户名',
    pass: ['FTP 密码', ,true],
    baseUrl: 'FTP 服务器基准 URL'
  },
  verbose: {
    port: ['FTP 端口号', 21]
  }
};


export default FtpUploader;
