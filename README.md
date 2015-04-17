# deploy-asset
[![NPM version](https://badge.fury.io/js/deploy-asset.svg)](https://npmjs.org/package/deploy-asset)
[![GitHub version][git-tag-image]][project-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-url]][daviddm-image]
[![Inline docs][doc-image]][doc-url]
[![Code Climate][climate-image]][climate-url]
[![Coverage Status][coveralls-image]][coveralls-url]


分析本地的 Web 文件，将它所引用到的所有静态资源全部上传到七牛上去，并且保证引用关系不错乱

## 安装

```bash
npm install --global deploy-asset
```


## 使用

```bash

da <folder> [options]

da --help # show all options

```

## 注意事项

* 如果在 JS 或 JSON 中要引用某个文件，只要将它放在字符串中，保证带有至少一个路径（`/` 或 `\`），并且有后缀名，如 `.js`


## API

[Click Here](https://qiu8310.github.io/deploy-asset/global.html#da]


## 调试

使用的是 [npmlog](https://github.com/isaacs/npmlog)，支持 6 种不同的日志级别，
分别是： `silly`， `verbose`， `info`， `warn`， `error`， `silent`，越后面的
输入的日志信息就越少。

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

