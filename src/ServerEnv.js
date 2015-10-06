import slash from 'slash';
import path from 'path';

import util from './util';

/**
 * 远程服务器相关的环境
 */
class ServerEnv {

  constructor(opts) {

    /**
     * 根目录
     * @type {string}
     */
    this.destDir = 'destDir' in opts ? opts.destDir : '/';

    let uploaderOpts = opts.uploader ? opts.uploader.opts : opts.uploaderOpts;

    let baseUrl = opts.baseUrl || uploaderOpts.baseUrl || uploaderOpts.domain;
    if (!baseUrl) throw new Error('NO_SPECIFY_BASE_URL');

    /**
     * 远程服务器的基本 URL
     * @type {string}
     */
    this.baseUrl = util.normalizeBaseUrl(baseUrl);


    /**
     * 是否要 destDir 附加到 baseUrl 中
     * @type {boolean}
     */
    this.appendDestDirToBaseUrl = 'appendDestDirToBaseUrl' in opts ? opts.appendDestDirToBaseUrl : true;

  }

  /**
   * 根据服务器相关配置，获取文件在此服务器上的 url
   * @param {File} file
   * @returns {string}
   */
  getFileRemoteUrl(file) {
    let {relative, basename} = file.remote;
    let dir = this.appendDestDirToBaseUrl ? this.destDir : '';
    return util.urlJoin(this.baseUrl, dir, relative, basename);
  }

  /**
   * 获取远程文件的目录
   * @param {File} file
   * @param {Boolean} absolute - 是否使用绝对路径
   * @returns {String}
   */
  getFileRemoteDir(file, absolute = true) {
    // @NOTE join('', '') => '.'
    let dir = path.join(this.destDir, file.remote.relative);
    if (dir === '.') dir = '';
    dir = slash(dir).replace(/\/$/, ''); // 统一转化成 / ，并去掉最后一个 /
    return dir.replace(/^\/?/, absolute ? '/' : '');
  }

  /**
   * 获取远程文件的路径
   * @param {File} file
   * @param {Boolean} absolute - 是否使用绝对路径
   * @returns {String}
   */
  getFileRemotePath(file, absolute = true) {
    let dir = this.getFileRemoteDir(file, absolute);
    return dir + ((dir === '' || dir === '/') ? '' : '/') + file.remote.basename;
  }



}

export default ServerEnv;
