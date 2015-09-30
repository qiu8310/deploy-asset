/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

import Uploader from './Uploader';

class MockUploader extends Uploader {

  constructor(opts, env) {
    super(opts, env);
    this._hook('constructor', true, opts);
    this._hook('init', true, opts);
  }

  _hook(name, rtn, ...args) {

    let err,
      hook = this.opts.hooks[name],
      done = args[args.length - 1];

    if (typeof done === 'function') args.pop();
    else done = () => {};

    if (typeof hook === 'function') {
      try {
        rtn = hook.apply(this, args);
      } catch (e) { err = e; }
    }

    done(err, rtn);
  }

  initService(done) { this._hook('initService', null, done); }
  destroyService(done) { this._hook('destroyService', null, done); }
  beforeUpload(done) { this._hook('beforeUpload', null, done); }
  afterUpload(done) { this._hook('afterUpload', null, done); }

  beforeUploadFile(file, done) { this._hook('beforeUploadFile', null, file, done); }
  afterUploadFile(file, done) { this._hook('afterUploadFile', null, file, done); }
  uploadFile(file, done) { this._hook('uploadFile', null, file, done); }
  isRemoteFileExists(file, done) { this._hook('isRemoteFileExists', false, file, done); }
  getRemoteFileContent(file, done) { this._hook('getRemoteFileContent', new Buffer('__content*dasd'), file, done); }
  removeRemoteFile(file, done) { this._hook('removeRemoteFile', null, file, done); }
}

MockUploader.config = {
  verbose: {
    hooks: ['hooks', {}],
    baseUrl: ['域名', 'da-mock.com'],
    destDir: ['路径', '/'],
    appendDestDirToBaseUrl: ['追回', true]
  }
};

export default MockUploader;

