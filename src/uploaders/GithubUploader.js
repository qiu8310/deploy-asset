/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

import Uploader from './Uploader';
import path from 'path';
import Github from 'github-api';
import binaryEextensions from 'binary-extensions';

class GithubUploader extends Uploader {

  constructor(env, opts) {
    super(env, opts);
    this.maxConcurrentJobs = 1;
  }

  /**
   * @override
   * @borrows Uploader.beforeInitOpts
   */
  beforeInitOpts(opts) {
    if (!opts.auth && !opts.user && !opts.pass && !opts.token) {

      this.log.warn('你当前使用的是 ^Github 上传器^ ');
      this.log.warn('你没有配置相关选项，所以使用的是一个公共帐号');
      this.log.warn('公共帐号的资源随时可能被他人删除或替换了');

      opts.domain = 'deploy-asset.github.io';
      opts.repo = 'deploy-asset.github.io';
      opts.branch = 'master';
      opts.auth = 'oauth';
      opts.token = '96d39d8e37c373a63fe4bb58ea6e14ddd16a4bad';
      opts.user = 'deploy-asset';
      opts.pass = '';

    } else {
      if (opts.auth === 'oauth') {
        opts.user = '';
        opts.pass = '';
      } else {
        opts.token = '';
      }
    }

    return opts;
  }


  /**
   * @override
   * @borrows Uploader.initService
   */
  initService() {
    let {auth, token, user, pass, repo} = this.opts;
    if (auth === 'oauth') this.github = new Github({token, auth});
    else this.github = new Github({username: user, password: pass, auth});

    this.repo = this.github.getRepo(user, repo);
  }

  /**
   * @override
   * @borrows Uploader.destroyService
   */
  destroyService() {
    this.github = null;
  }

  /**
   * @override
   * @borrows Uploader.uploadFile
   */
  uploadFile(file, done) {
    let filePath = this.env.getFileRemotePath(file, false);
    let ciMessage = 'Update file ' + filePath;
    this.repo.write(this.opts.branch, filePath, file.remote.content, ciMessage, done);
  }

  /**
   * @override
   * @borrows Uploader.isRemoteFileExists
   */
  isRemoteFileExists(file, done) {
    this.repo.read(this.opts.branch, this.env.getFileRemotePath(file, false), (err, data) => {
      done(null, !!data);
    })
  }

  /**
   * 注意，Github 的 pages 生成会有很短的时间延迟，所以刚上传完的文件可能没法立即得到其内容
   *
   * 也不能使用 repo.read 方法，它返回的是字符串，不是 buffer，
   * 字符串转化成 buffer 不一定和原内容一致
   *
   * @override
   * @borrows Uploader.getRemoteFileContent
   */
  getRemoteFileContent(file, done) {
    // 判断文件类型，如果是文件文件，通过 api 的形式获取，如果是其它类型文件，则通过下载的形式
    if (binaryEextensions.indexOf(file.ext.toLowerCase()) >= 0) {
      Uploader.download(file.remote.url, done);
    } else {
      this.repo.read(this.opts.branch, this.env.getFileRemotePath(file, false), (err, data) => {
        if (err) done(err);
        else if (typeof data !== 'string') done(new Error(data || 'UNKNOWN'));
        else done(null, new Buffer(data));
      });
    }
  }

  /**
   * @override
   * @borrows Uploader.removeRemoteFile
   */
  removeRemoteFile(file, done) {
    this.repo.remove(this.opts.branch, this.env.getFileRemotePath(file, false), done);
  }
}

GithubUploader.config = {
  error: {
    auth: 'Github 的认证方式(basic/oauth)',
    user: 'Github 用户名',
    pass: 'Github 用户密码',
    token: 'Github 的 oauth token',
    domain: 'Github 的域名',
    repo: 'Git 创库名称',
    branch: 'Git 的分支'
  }
};

export default GithubUploader;

