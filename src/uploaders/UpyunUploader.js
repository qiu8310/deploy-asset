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
import Upyun from 'upyun';

class UpyunUploader extends Uploader {


  _mkdirp(dir, done) {
    this.upyun.existsFile(dir, (err, res) => {
      if (err) return done(err);

      if (res.error) { // 文件不存在，需要重新创建
        this.upyun.createDir(dir, function (err, res) {
          done(err || res.error, dir);
        });
      } else { // 文件存在，直接返回
        done(null, dir);
      }
    });
  }

  /**
   * @override
   * @borrows Uploader.beforeInitOpts
   */
  beforeInitOpts(opts) {
    if (!opts.operator && !opts.password && !opts.bucket && !opts.domain) {
      this.log.warn('你当前使用的是 ^又拍云上传器^ ');
      this.log.warn('你没有配置任何的又拍云配置，所以默认使用了一个公共的又拍云帐号');
      this.log.warn('此公共帐号 #随时可能被禁用# ，你可以去又拍云官网申请一个免费的帐号即可');

      opts.operator = 'dao';
      opts.password = 'da-deploy-asset';
      opts.bucket = 'da-deploy-asset';
      opts.domain = 'da-deploy-asset.b0.upaiyun.com';
    }

    return opts;
  }

  /**
   * @override
   * @borrows Uploader.initService
   */
  initService() {
    let {bucket, operator, password, endpoint, apiVersion} = this.opts;
    this.upyun = new Upyun(bucket, operator, password, endpoint, apiVersion);
  }

  /**
   * @override
   * @borrows Uploader.destroyService
   */
  destroyService() {
    this.upyun = null;
  }

  /**
   * @override
   * @borrows Uploader.uploadFile
   */
  uploadFile(file, done) {
    let filePath = this.env.getFileRemotePath(file);
    this._mkdirp(this.env.getFileRemoteDir(file), err => {
      if (err) return done(err);
      this.upyun.uploadFile(filePath, file.remote.content, file.mimeType, true, (err, res) => {
        if (err || res.error) return done(err || res.error);
        done(null, res);
      });
    });
  }

  /**
   * @override
   * @borrows Uploader.isRemoteFileExists
   */
  isRemoteFileExists(file, done) {
    this.upyun.existsFile(this.env.getFileRemotePath(file), (err, res) => {
      if (err) return done(err);
      if (res.error) {
        if (res.error.code === 404) done(null, false);
        else done(res.error);
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
    let tmpFilePath = this.constructor.getLocalTmpFilePath();
    let clear = () => fs.removeSync(tmpFilePath);

    this.upyun.downloadFile(this.env.getFileRemotePath(file), tmpFilePath, (err, rtn) => {
      if (err || rtn.error || rtn.statusCode >= 400) {
        clear();
        return done(err || rtn);
      }

      fs.readFile(tmpFilePath, (err, rtn) => {
        clear();
        done(err, rtn);
      })
    })
  }

  /**
   * @override
   * @borrows Uploader.removeRemoteFile
   */
  removeRemoteFile(file, done) {
    this.upyun.removeFile(this.env.getFileRemotePath(file), (err, res) => {
      if (err || res.error) return done(err || res.error);
      done(null, res);
    });
  }
}

UpyunUploader.config = {
  error: {
    operator: '又拍云 操作员',
    password: ['又拍云 操作员密码', ,true],
    bucket: '又拍云 空间',
    domain: '又拍云 当前空间的域名'
  },
  verbose: {
    endpoint: ['又拍云 节点', 'v0'],
    apiVersion: ['又拍云 接口版本', 'legacy']
  }
};

export default UpyunUploader;

