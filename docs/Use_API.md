## 使用 deploy-asset 的 API

### 安装

```
npm install --save-dev deploy-asset@next
```

### 使用

```js
var da = require('deploy-asset');

da(files_or_directory, options, function (err, files, opts) {
  
  if (err) {
    // 处理错误
  } else {

    /*
      - {Array<File>} files - File 对象记录了些文件相关的所有信息，可以查看下面的文档看它有哪些属性。
      - {Object}      opts  - opts 是对用户传入的 options 进行处理过后的新的 options
     */
  }


});

```

* 关于 options 配置可以 [查看这里](../src/da.js#L18-L108)
* 关于 File 对象可以 [查看这里](../src/file.js)


[《使用 deploy-asset 的 CLI》](./Use_CLI.md)
