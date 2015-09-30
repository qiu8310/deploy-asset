/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

import Uploader from './Uploader';
import path from 'path';
import qiniu from 'qiniu';

class QiniuUploader extends Uploader {


  /**
   * @override
   * @borrows Uploader.beforeInitOpts
   */
  beforeInitOpts(opts) {
    if (!opts.ak && !opts.sk && !opts.bucket && !opts.domain) {
      this.log.warn('你当前使用的是 ^七牛上传器^ ');
      this.log.warn('你没有配置任何的七牛配置，所以默认使用了一个公共的七牛帐号');
      this.log.warn('此公共帐号 #无法上传 html 文件# ，你可以去七牛官网申请一个免费的帐号即可');

      opts.ak = '6mU6vJ3h3ffH4DrPaAyH1SDsDMktTjpBq0U6Zo8G';
      opts.sk = '0Haz628E6jxjRwdXUiYpbH4jApz019XM6L6Ykl0M';
      opts.bucket = 'depot-asset';
      opts.domain = '7ximfq.com1.z0.glb.clouddn.com';
    }

    return opts;
  }

  /**
   * @override
   * @borrows Uploader.initService
   */
  initService() {
    qiniu.conf.ACCESS_KEY = this.opts.ak;
    qiniu.conf.SECRET_KEY = this.opts.sk;
    this.client = new qiniu.rs.Client();
  }

  /**
   * @override
   * @borrows Uploader.destroyService
   */
  destroyService() {
    this.client = null;
  }

  /**
   * @override
   * @borrows Uploader.uploadFile
   */
  uploadFile(file, done) {
    // bucket:filename => 覆盖式上传
    let filePath = this.env.getFileRemotePath(file, false);
    let token = new qiniu.rs.PutPolicy(this.opts.bucket + ':' + filePath).token();
    let extra = new qiniu.io.PutExtra({}, file.mimeType);
    qiniu.io.put(token, filePath, file.remote.content, extra, (err, ret) => {
      if (err) return done(err);
      done(null, ret);
    });
  }

  /**
   * @override
   * @borrows Uploader.isRemoteFileExists
   */
  isRemoteFileExists(file, done) {
    this.client.stat(this.opts.bucket, this.env.getFileRemotePath(file, false), (err) => {
      if (err) {
        if (err.code === 612) return done(null, false);
        return done(err);
      }
      done(null, true);
    });
  }

  /**
   * @override
   * @borrows Uploader.getRemoteFileContent
   */
  getRemoteFileContent(file, done) {
    this.constructor.download(file.remote.url, (err, buffer) => {
      done(err, err ? null : buffer);
    });
  }

  /**
   * @override
   * @borrows Uploader.removeRemoteFile
   */
  removeRemoteFile(file, done) {
    this.client.remove(this.opts.bucket, this.env.getFileRemotePath(file, false), (err, ret) => {
      if (err) return done(err);
      done(null, ret);
    });
  }
}


QiniuUploader.config = {
  error: {
    ak: '七牛 Access Key',
    sk: ['七牛 Secret Key', ,true],
    bucket: '七牛 空间',
    domain: '七牛 当前空间的域名'
  }
};

export default QiniuUploader;

