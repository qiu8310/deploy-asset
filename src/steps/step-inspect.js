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

      let assetFiles = assets.map(asset => {
        let assetFile = getFile(asset.filePath, asset);
        assetFile.addCaller(file);
        return assetFile;
      });

      assets.forEach(a => {
        ylog.verbose(`   资源 &%s-%s& : &%s&  *引用处: %s*`, a.start, a.end, a.src, a.raw);
      });
      ylog.info.writeOk('共找到 ^%s^ 处静态资源', assets.length).ln();

      return assetFiles;
    };

    let walk = (files) => {
      files.forEach(file => {
        walk(inspect(file));
      });
    };

    let startFiles = filePaths.map(getFile);
    walk(startFiles);

    ylog.verbose('检查后的文件 *%o*', inspectedFiles.map(file => file.relativePath));

    outputFileTree(path.basename(opts.rootDir), startFiles);

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
 */
function outputFileTree(base, files) {
  // @TODO
}
