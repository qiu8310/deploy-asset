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

var FTP = require('ftp');

class FtpUploader extends Uploader {

  /**
   * @override
   * @borrows Uploader.initService
   */
  initService(done) {
    let opts = this.opts;
    let ftp = new FTP();
    let ended = false;
    let cb = (err) => {
      if (ended) return true;
      ended = true;
      done(err);
    }

    ftp.connect({
      host: opts.host,
      user: opts.user,
      password: opts.pass,
      port: opts.port
    });

    ftp.on('error', cb)
    ftp.on('ready', cb);

    this.ftp = ftp;
  }

  /**
   * @override
   * @borrows Uploader.destroyService
   */
  destroyService(done) {
    this.ftp.end();
  }


  /**
   * @override
   * @borrows Uploader.uploadFile
   */
  uploadFile(file, done) {
    this.ftp.mkdir(this.env.getFileRemoteDir(file), true, err => {
      if (err) return done(err);
      this.ftp.put(file.remote.content, this.env.getFileRemotePath(file), done);
    });
  }

  /**
   * @override
   * @borrows Uploader.isRemoteFileExists
   */
  isRemoteFileExists(file, done) {
    this.ftp.size(this.env.getFileRemotePath(file), (err, res) => {
      if (err) {
        if (err.code === 550) done(null, false);
        else done(err);
      } else {
        done(null, true);
      }
    });
  }


  /**
   * @override
   * @borrows Uploader.getRemoteFileContent
   */
  getRemoteFileContent(file, done) {

    this.ftp.get(this.env.getFileRemotePath(file), (err, stream) => {
      if (err) return done(err);
      let data = [];
      stream.on('data', buffer => data.push(buffer));
      stream.on('end', () => done(null, Buffer.concat(data)));
    });
  }


  /**
   * @override
   * @borrows Uploader.removeRemoteFile
   */
  removeRemoteFile(file, done) {
    this.ftp.delete(this.env.getFileRemotePath(file), done);
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
