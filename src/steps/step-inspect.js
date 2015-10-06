import ylog from 'ylog';
import async from 'async';
import _ from 'lodash';
import path from 'x-path';
import min from 'min-asset';
import pb from 'pretty-bytes';

import util from '../util';
import File from '../File';

function _getMinFileType(file) {
  if (file.type === File.STATIC_TYPE) {
    if (_.includes(['png', 'jpeg', 'jpg', 'gif', 'svg'], file.ext)) return 'image';
  } else {
    return file.type;
  }
}

function _compress(file, done) {
  let type = _getMinFileType(file);
  let minOpts = file.opts['min' + _.capitalize(type)] || {};
  if (!type) return done(null, file);

  ylog.info.title('开始压缩文件 ^%s^ ...', file.relativePath);
  min(file.content, type, minOpts, (err, data) => {

    if (err) return done(err);
    let oz = data.originalSize, mz = data.minifiedSize;
    let diff = oz - mz;
    let rate = (diff * 100 / oz).toFixed();
    if (diff > 10) {
      file.min = {};
      file.min.originalSize = oz;
      file.min.minifiedSize = mz;
      file.min.diffSize = diff;
      file.min.rate = rate;
      ylog.info.writeOk('新文件 !%s! , 文件压缩了 ~%s~ , 压缩率 ~%s%~', pb(mz), pb(diff), rate).ln();
      file.remote.content = data.content;
    } else {
      ylog.info.writeOk('*文件已经最小了，不需要压缩（改变压缩配置看看）*').ln();
    }
    done(null, file);

  });
}

function _inspect(file, done) {
  if (file.type === File.STATIC_TYPE) return done(null, []);

  ylog.info.title('开始检查文件 ^%s^ ...', file.relativePath);

  let assets = file.insp(file.opts.inspectFilter);

  assets.forEach(a => {
    ylog.verbose(`   资源 &%s-%s& : &%s&  *引用处: %s*`, a.start, a.end, a.src, a.raw);
  });

  ylog.info.writeOk('共找到 ^%s^ 处静态资源', assets.length).ln();

  done(null, file.resolveAssets())
}

export default function (filePaths, opts, next) {

  util.banner('资源检查' + (opts.min ? '(并压缩)' : ''));

  File.refs = {}; // 先将引用清空
  let inspectedFiles = [];

  try {

    let getFile = (filePath, asset = null) => {
      let file = File.findFileInRefs(filePath);
      return file ? file : new File(filePath, opts.rootDir, opts, asset);
    };

    let inspect = (file, done) => {
      if (inspectedFiles.indexOf(file) >= 0) return done(null, []);
      inspectedFiles.push(file);

      if (opts.min) {
        _compress(file, (err, file) => {
          if (err) return done(err);
          _inspect(file, done);
        });
      } else {
        _inspect(file, done);
      }
    };

    let walk = (files, done) => {
      async.eachSeries(
        files,

        (file, next) => {
          inspect(file, (err, assets) => {
            if (err) return done(err);
            walk(assets, next);
          });
        },

        done
      );
    };

    let startFiles = filePaths.map(getFile);
    walk(startFiles, err => {
      if (err) return next(err);

      ylog.verbose('检查后的文件 *%o*', inspectedFiles.map(file => file.relativePath));

      // 检查是否为没有上传，同时又包含其它上传了的静态资源的文件指定 outDir
      err = inspectedFiles.some(f => {
        if (f.shouldSave() && !opts.outDir) {
          ylog
            .error('没有指定 ~outDir~ 参数').ln()
            .error('文件 ^%s^ 指定为不要上传，但此文件包含有其它静态资源，它里面的内容会被替换', f.relativePath).ln()
            .error('所以如果不上传此文件，请指定一个输出目录，将更新后的文件输出在指定的目录内');

          return true;
        }
      });
      if (err) return next(new Error('NO_OUT_DIR_FOR_FILE'));

      err = inspectedFiles.some(f => {
        let a = f.assets.length && f.assets.find(a => !getFile(a.filePath).apply.upload);
        if (f.apply.upload && f.apply.replace && a) {
          ylog
            .error('文件 ^%s^ 需要上传，但它所依赖的静态 ^%s^ 却没有上传', f.relativePath, a.filePath).ln()
            .error('这样可能会导致上传的文件找不到它的依赖而显示不正常');
          return true;
        }
      });
      if (err) return next(new Error('DEPEND_ASSET_NOT_UPLOAD'));

      next(null, inspectedFiles, opts);
    });

    //outputFileTree(opts.rootDir, startFiles);

  } catch (e) { return next(e); }

}

/*
 basic
 ├── a.txt
 ├── j1.json
 └── j2.json
 │   └── a.txt
 └── index.html
 └── d/d.css
 │   └── c.gif
 └── b.js
 └── d/e/e.js

archy
 '│' : '|',
 '└' : '`',
 '├' : '+',
 '─' : '-',
 '┬' : '-'

 deploy-asset@1.0.0-alpha /Users/Mora/Workspace/node/deploy-asset
 ├─┬ alter@0.2.0
 │ └── stable@0.1.5
 ├── async@1.4.2


 └─┬ ylog@0.2.2
 ├─┬ are-we-there-yet@1.0.4
 │ ├── delegates@0.1.0
 │ └─┬ readable-stream@1.1.13
 │   ├── core-util-is@1.0.1
 │   ├── inherits@2.0.1
 │   ├── isarray@0.0.1
 │   └── string_decoder@0.10.31
 ├─┬ chalk@1.1.1
 │ ├── ansi-styles@2.1.0
 │ ├── escape-string-regexp@1.0.3
 │ ├─┬ has-ansi@2.0.0
 │ │ └── ansi-regex@2.0.0
 │ ├─┬ strip-ansi@3.0.0
 │ │ └── ansi-regex@2.0.0
 │ └── supports-color@2.0.0

 */
function outputFileTree(base, files) {
}
