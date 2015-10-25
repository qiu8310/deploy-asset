## 使用 deploy-asset 的 CLI


### 安装

```
npm install -g deploy-asset
```

### 使用

**请使用 `da -h` 查看所有支持的选项**


### darc 配置文件

配置文件使用的库是 [rc](https://github.com/dominictarr/rc)，它会自动在你项目所在的目录及各级父目录和当前用户根目录下查找 `.darc` 文件，查找过程如下：

```
-> 当前文件夹下查找 .darc
-> 当前文件的父目录查找 .darc
-> 当前文件的父目录的父目录查找 .darc
-> ...
-> 磁盘根目录下查找 .darc
-> 用户根目录下查找 .darc

最后 => 将所有找到的文件深度 merge，最先找到的配置会覆盖后面找到的
```


配置文件中可以使用的选项和 `da -h` 上看到的选项是一致的，不过在配置文件中，可以对 uploader 进行分组
配置。

**比如我有两个 ftp 帐号，可以这样配置：**

```json
{
  "uploader": "ftp_stage",
  "uploaders": {
    "ftp_stage": {
      "alias": "ftp",
      "host": "....",
      "user": "...",
      "pass": "...",
      "port": 21,
      "baseUrl": "http://www.you_server",
      "destDir": "welcome/abc"
    },
    "ftp_prod": {
      "alias": "ftp", 
      "host": "....",
      "user": "...",
      "pass": "...",
      "port": 21,
      "baseUrl": "...",
      "destDir": "..."
    }
  }
}
```

然后只需要使用 `da` 就会默认使用 ftp_stage 所指定的这个 ftp uploader 的配置；
而如果使用 `da -u ftp_prod` 则会使用 ftp_prod 所指定的这个 ftp uploader 的配置。


**除了支持 ftp 外，还支持 qiniu, upyun 和 github，它们的配置项如下所求：**

```json
{
  "uploaders": {
    "ftp": {
      "host": "....",
      "user": "...",
      "pass": "...",
      "port": 21
    },

    "qiniu": {
      "ak": "七牛 Access Key",
      "sk": "七牛 Secret Key",
      "bucket": "七牛 空间",
      "domain": "七牛 当前空间的域名"
    },

    "upyun": {
      "operator": "又拍云 操作员",
      "password": "又拍云 操作员密码",
      "bucket": "又拍云 空间",
      "domain": "又拍云 当前空间的域名",
      "endpoint": "v0",
      "apiVersion": "legacy"
    },

    "github": {
      "auth": "Github 的认证方式(basic/oauth)",
      "user": "Github 用户名",
      "pass": "Github 用户密码",
      "token": "Github 的 oauth token",
      "domain": "Github 的域名",
      "repo": "Git 创库名称",
      "branch": "Git 的分支"
    }
  }
}

```

所有的 uploader 配置都支持指定 `destDir`, `appendDestDirToBaseUrl`, `domain`/`baseUrl` 或 `options`。

其中，如果指定了 `options`，则它内部配置的选项会覆盖最外层的配置，其它三项涵义请使用 `da -h` 查看。


### 举例

> 前提是已经使用 .darc 文件配置好了所有的支持的 uploader

* 【上传单个图片文件】单独上传某一张图片到七牛上

  ```bash
  da /path/to/image_file --u qiniu
  ```

* 【上传多个图片文件】将当前文件夹下的所有 png 图片传到又拍去上

  ```bash
  da *.png -u upyun
  ```


* 【上传一个 HTML 文件】将 index.html 上传到七牛上

  ```bash
  da index.html -u qiniu
  ```

  这样的话，如果 index.html 中引用了其它文件，都会被上传上去，可以保证你上传后访问的文件是完全正常的。

* 【只上传一个 HTML 文件】将 index.html 上传到七牛，但此文件中依赖的文件不需要上传
  
  ```bash
  da index.html -u qiniu --nins index.html
  ```

  这样设定的话，不会对 index.html 进行 inspect 步骤，即不会去查找它内部的依赖。

* 【上传一个文件夹】将 /project 目录下的 dist 目录部署到到 ftp 上

  ```bash
  da /project/dist -u ftp
  ```

  不仅文件夹会上传，文件之间的引用关系也会更新

* 【不上传 html】上传 /project/dist 项目下 html 中引用到的文件，但不上传 html

  ```bash
  da /project/dist/**/*.html --abs "**/*.html" --nupl "**/*.html" --outDir out

  # 或者使用快捷命令

  da /project/dist/**/*.html --noAllHtml
  ```



### 调试

使用的是 [ylog](https://github.com/qiu8310/ylog)，支持下面几种不同的日志级别，
分别是： `silly`， `verbose`， `info`， `warn`， `error`， `silent`，越后面的
输出的日志信息就越少。


通过参数来设置不同的日志级别： `--logLovel` 或 `-l`，如 `--logLevel=verbose` 或 `-l verbose`，
另外支持简写形式，`--verbose`，`--silent`, `-d`, `-dd`, `-ddd`。

另外，如果程序出错时，默认只会显示 error.messsage 信息，不会显示 error.stack 信息，可以指定参数 `--stack`
来使程序在出错时输出 error.stack 的详细信息。



[《使用 deploy-asset 的 API》](./Use_API.md)



