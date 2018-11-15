# deploy-asset

<!-- [![NPM version](https://badge.fury.io/js/deploy-asset.svg)](https://npmjs.org/package/deploy-asset) -->

简称 `da`，对前端静态资源进行 Minify, Revisioning 以及 Uploading

* **Minify** —— 使用了 [min-asset 模块](https://github.com/qiu8310/min-asset)，支持对常见的静态资源压缩
  - `js`： 使用了 [uglify-js 模块](https://github.com/mishoo/UglifyJS2/) 来压缩
  - `css`： 使用了 [clean-css 模块](https://github.com/jakubpawlowicz/clean-css) 来压缩
  - `html`： 使用了 [html-minifier 模块](http://kangax.github.io/html-minifier/) 来压缩
  - `json`： 使用了 [原生函数 JSON.stringify](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 来压缩
  - `image`： 使用了 [imagemin 模块](https://github.com/imagemin/imagemin/) 来压缩

* **Revisioning** —— 修订，即对静态资源的文件名打上 hash，并替换它在原文件中的引用
  > 类似于 [grunt-rev](https://github.com/cbas/grunt-rev), [gulp-rev](https://github.com/sindresorhus/gulp-rev), [gulp-rev-all](https://github.com/smysnk/gulp-rev-all) 和 [webpack 对文件名进行 hash](http://webpack.github.io/docs/configuration.html#output-chunkfilename) 的功能
  >
  > 关于 “为什么要对文件打 hash ” 请参考 [fouber](https://github.com/fouber) 写的 [《大公司里怎样开发和部署前端代码》](https://github.com/fouber/blog/issues/6)
  >

  Revisioning 分两种情况：(关于两者有什么区别，[可以参考这里](https://github.com/smysnk/gulp-rev-all#consider-the-following-example))

  - 先计算文件内容的 hash，再替换文件中的静态资源 (在 `da` 中可以通过指定 `hashSource=local` 来实现)
  - 先替换文件中的静态资源，再计算文件内容的 hash (在 `da` 中可以通过指定 `hashSource=remote` 来实现)

* **Uploading** —— 当前支持上传到下面的服务器上
  - [七牛][qiniu]： 使用了七牛官方提供的 [qiniu 模块](https://github.com/qiniu/nodejs-sdk) 来上传文件
  - FTP： 使用了开源的 [ftp 模块](https://github.com/mscdex/node-ftp) 来上传文件
  - [又拍云][upyun]： 使用了又拍云官方提供的 [upyun 模块](https://github.com/upyun/node-upyun) 来上传文件
  - [Github][github]： 使用了开源的 [github-api 模块](https://github.com/michael/github) 来上传文件，**注意：此模块每上传一个文件，都是一次 commit 操作，所以如果上传大量文件，会非常慢，甚至出错**
  
  另外，也可以很容易扩展自己的 Uploader，[参考这里][uploaders]

## 常见问题
* clone该项目之后,文件目录下面没有build文件，需要先运行`npm run build `生成`build`目录,然后才能正常运行`dar --spa=index.html `命令
* HTML 放在后端，CSS/JS 放在静态服务器上，同时 CSS 中的图片也能放到静态服务器上，但 HTML 中的图片放哪？

>
> 如果放静态服务器，但测试服务器和线上服务器的地址不一样，必然会引起在发布代码时更新 HTML 中图片的域名，
> 这样就需要后端提供一个可配置域名的服务！
>
> 如果放到动态服务器，这样图片地址就需要换成相对于动态服务器的地址
>


## 相关文档

* [项目背景](./docs/Background.md)
* [执行流程](./docs/Flow.md)
* [使用CLI](./docs/Use_CLI.md)
* [使用API](./docs/Use_API.md)

## 待办事项

* [ ] 自动合拼图片（用在此工具上有点困难）
* [ ] 有空了可以自己写个 ftp 模块，正好学习下 node 的 socket 编程
* [ ] 最好重写下 ServerEnv 这一块的东西
* [ ] update-notifier - Update notifications for your CLI app.
* [ ] uploader 可以指定在上传完后才生成远程链接，这样就强制 concurrency 为 1 了
* [ ] [CLI-MD](https://github.com/finnp/cli-md/blob/master/index.js)
  - [ ] CLI-TO-MD: 将 yargs 产生的 help 信息生成 markdown (HERE_DOC)
  - [ ] MD-TO-CLI: 用 markdown 来产生 yargs 的 help 信息 (HERE_DOC)

## 更新日志

[CHANGELOG.md](./CHANGELOG.md)

## License

Copyright (c) 2015 Zhonglei Qiu. Licensed under the MIT license.


[da-repo]: https://github.com/qiu8310/deploy-asset
[qiniu]: http://www.qiniu.com/
[upyun]: https://www.upyun.com/
[github]: https://github.com/
[uploaders]: ./src/uploaders


