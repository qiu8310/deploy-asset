import ylog from 'ylog';
import path from 'x-path';

import util from '../util';
import File from '../File';

export default function (filePaths, opts, next) {

  util.banner('资源检查');

  File.refs = {}; // 先将引用清空
  let inspectedFiles = [];

  try {

    let getFile = (filePath, asset = null) => {
      let file = File.findFileInRefs(filePath);
      return file ? file : new File(filePath, opts.rootDir, opts, asset);
    };

    let inspect = (file) => {
      if (inspectedFiles.indexOf(file) >= 0) return [];
      inspectedFiles.push(file);

      ylog.info.title('开始检查文件 ^%s^ ...', file.relativePath);

      let assets = file.insp(opts.inspectFilter);

      assets.forEach(a => {
        ylog.verbose(`   资源 &%s-%s& : &%s&  *引用处: %s*`, a.start, a.end, a.src, a.raw);
      });
      ylog.info.writeOk('共找到 ^%s^ 处静态资源', assets.length).ln();

      return file.resolveAssets();
    };

    let walk = (files) => {
      files.forEach(file => {
        walk(inspect(file));
      });
    };

    let startFiles = filePaths.map(getFile);
    walk(startFiles);

    ylog.verbose('检查后的文件 *%o*', inspectedFiles.map(file => file.relativePath));

    //outputFileTree(opts.rootDir, startFiles);

    next(null, inspectedFiles, opts);

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
