# deploy-asset
[![NPM version](https://badge.fury.io/js/deploy-asset.svg)](https://npmjs.org/package/deploy-asset)
[![GitHub version][git-tag-image]][project-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-url]][daviddm-image]
[![Inline docs][doc-image]][doc-url]
[![Code Climate][climate-image]][climate-url]
[![Coverage Status][coveralls-image]][coveralls-url]


分析本地的 Web 文件，将它所引用到的所有静态资源全部上传到 七牛/FTP (还可以自定义其它 [Uploader](./examples/custom-uploader.js) )上去，并且保证引用关系不错乱

[Github Repo][project-url]

[JSDOC Generated Document](http://qiu8310.github.io/deploy-asset)


## 安装

```bash
npm install --global deploy-asset
```

## 使用

### 命令行

```bash

da <folder> [options]

da --help # show all options

```

### Node 脚本

```javascript
var da = require('deploy-asset')

da(folder, globPatterns, options, function(err, fileMap) {
  // ...
})
```

### Grunt

[grunt-deploy-asset](https://github.com/qiu8310/grunt-deploy-asset)

## Options

[Click Here To See All Options](https://qiu8310.github.io/deploy-asset/global.html#da)

## 注意事项

* 如果在 JS 或 JSON 中要引用某个文件，只要将它放在字符串中，保证带有至少一个路径（`/` 或 `\`），并且有后缀名，如 `.js`

* __使用命令行时如果用了 glob，一定要加引号__ 

  比如，如果你想排除所有图片文件用此命令：`da --excludes *.png`，但 *.png 会被 shell 解析成可能的 a.png b.png c.png，所以你的命令变成了：
  `da --excludes a.png b.png c.png` 并不是你想要的结果。因而，需要加上引号写成 `da --excludes '*.png'`

* 更新提醒
 
v0.3.3 及其之前的版本，配置信息是放在 `uploaderOptions` 选项中的，为了实现支持多个 uploader 随意切换，现在将所有的 uploaders 配置放在 `uploaders` 中。（对于老版本的配置还是兼容的，但如果使用了新版本的配置就不会使用老版本的）

如：以前的配置可以是：

```
{
  uploader: 'qiniu',
  uploaderOptions: {
    ak: '...',
    sk: '...',
    bucket: '...',
    domain: '...'
  }
}
```

现在的配置是：

```
{
  uploader: 'qiniu',    // 默认的 uploader
  uploaders: {          // 这里放的是所有支持的 uploader 的默认配置
    qiuniu: {
      ak: '...',
      sk: '...',
      bucket: '...',
      domain: '...'
    },
    ftp: {
      host: '....'
      user: '...',
      pass: '...',
      port: 21,
      baseUrl: '...',
      destDir: '...'
    }
  }
}
```



## 调试

使用的是 [npmlog](https://github.com/isaacs/npmlog)，支持 6 种不同的日志级别，
分别是： `silly`， `verbose`， `info`， `warn`， `error`， `silent`，越后面的
输出的日志信息就越少。

可以通过以下两种方式来设置日志级别：

* 通过参数： `--log-level` 或 `-l`，如 `--log-level=verbose` 或 `-l verbose`，
  另外支持三种简写形式，`--verbose`，`--info`，`--silent`

* 通过环境变量：类似于 [debug](https://github.com/visionmedia/debug) 的写法，如
  `DEBUG=da:verbose` 或 `DEBUG=da:info`



## License

Copyright (c) 2015 Zhonglei Qiu. Licensed under the MIT license.



[doc-url]: http://inch-ci.org/github/qiu8310/deploy-asset
[doc-image]: http://inch-ci.org/github/qiu8310/deploy-asset.svg?branch=master
[project-url]: https://github.com/qiu8310/deploy-asset
[git-tag-image]: http://img.shields.io/github/tag/qiu8310/deploy-asset.svg
[climate-url]: https://codeclimate.com/github/qiu8310/deploy-asset
[climate-image]: https://codeclimate.com/github/qiu8310/deploy-asset/badges/gpa.svg
[travis-url]: https://travis-ci.org/qiu8310/deploy-asset
[travis-image]: https://travis-ci.org/qiu8310/deploy-asset.svg?branch=master
[daviddm-url]: https://david-dm.org/qiu8310/deploy-asset.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/qiu8310/deploy-asset
[coveralls-url]: https://coveralls.io/r/qiu8310/deploy-asset
[coveralls-image]: https://coveralls.io/repos/qiu8310/deploy-asset/badge.png



[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/qiu8310/deploy-asset/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

