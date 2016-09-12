import ylog from 'ylog';
import dep from 'dep.js';
import _ from 'lodash';

import util from '../util';
import File from '../file';

export default function (files, opts, next) {

  util.banner('开始替换');
  let resolvedFiles = [];
  let retrieveRemoteUrlAfterUploaded = opts.uploader && opts.uploader.retrieveRemoteUrlAfterUploaded;

  try {

    let replace = (file, updateRemote) => {

      if (file.type === File.STATIC_TYPE) {
        if (updateRemote) file.updateRemote();
        return true;
      }

      ylog.info.title('开始替换文件 ^%s^ ...', file.relativePath);

      let assets = file.replace();
      if (updateRemote) file.updateRemote();

      assets.forEach(a => {
        ylog.verbose(`   使用 ^%s^ 替换了 &%s& ； *引用处: %s*`, a.target, a.src, a.raw);
      });
      ylog.info.writeOk('共替换 ^%s^ 处静态资源', assets.length);
      ylog.info.writeOk('生成远程链接 ^%s^', file.remote.url).ln();
    };

    let resetFilesDepends = (ignores) => {
      files.forEach(file => {
        file.deepDepends = null;
        if (ignores) {
          file.depends = _.difference(file.depends, ignores);
        } else {
          file.depends = _.uniq(file.assets.map(a => a.filePath));
        }
      });
    };
    let getFilePathFromError = (err) => err.message.replace('Cycle depend on ', '');

    let resolve = (file) => {
      if (!(file instanceof File)) file = File.findFileInRefs(file);

      if (resolvedFiles.indexOf(file) >= 0) return false;
      resolvedFiles.push(file);

      file.deepDepends.forEach(resolve);

      replace(file, true);
    };

    let dependsCheck = () => {
      resetFilesDepends();
      let hasDepends = true, dependFile;

      if (opts.ignoreDependsError && !retrieveRemoteUrlAfterUploaded) {
        while (hasDepends) {
          if (hasDepends instanceof Error) {
            dependFile = getFilePathFromError(hasDepends);

            ylog.color('yellow')
              .warn('发现有多个文件循环依赖于 ^%s^', dependFile).ln
              .warn('由于开启了 ~--ignoreDependsError~ ，所以此文件的 hash 值是根据本地文件的内容来计算的').ln();

            File.findFileInRefs(dependFile).updateRemote();
            resetFilesDepends([dependFile]);
          }
          try { hasDepends = false; dep(files); } catch (e) { hasDepends = e; }
        }
      } else {
        try { dep(files); } catch (e) {
          dependFile = getFilePathFromError(e);

          let note = retrieveRemoteUrlAfterUploaded
            ? '文件上传后才能知道它的远程链接，所以无法启用 ~--ignoreDependsError~ '
            : '可以开启 ~--ignoreDependsError~ 来忽略此错误';

          ylog.color('red')
            .error('发现有多个文件循环依赖于 ^%s^', dependFile).ln.error(note).ln();

          throw new Error('DEPENDS_ERROR');
        }
      }
    };

    // 只有三种情况才需要对文件进行排序：
    // 1. 指定了 dependsCheck
    // 2. 需要根据远程文件内容来计算文件的 hash 值
    // 3. 文件的链接是在上传完后才能知道，这样就需要先上传无依赖的文件，并且这种情况下有循环依赖时无法 ignore
    if (opts.dependsCheck ||
      opts.hash && opts.hash > 0 && opts.hashSource === 'remote' ||
      retrieveRemoteUrlAfterUploaded) {

      ylog.info.title('检查是否有循环依赖的情况 ...');
      dependsCheck();
      ylog.info.writeOk('循环依赖检查完成').ln();

      files.forEach(resolve);

    } else {
      files.forEach(file => file.updateRemote());
      files.forEach(replace);
    }

    next(null, resolvedFiles.length ? resolvedFiles : files, opts);

  } catch (e) { return next(e); }
}
