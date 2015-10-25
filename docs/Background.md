## deploy-asset 项目背景

随着 [grunt][grunt], [gulp][gulp], [broccoli][broccoli] 和 [webpack][webpack] 等工具的兴起，
工作流（workflow）慢慢地成为了前端工程师们日常讨论的重要话题之一。
如今，基本上每个前端项目下面都能找到一个工作流相关的配置文件，像 `gruntfile.js`, `gulpfile.js`。
在这些文件内部，会配置一些 **Task** ， 用来对源代码进行不同的处理，一个 task 一般对应于一项处理任务，
如 `imagemin` 任务，就表示专门对图片进行压缩的任务，
而 `babel` 就一般用来将 es6 代码编译成 es5 代码；
当然也可以将许多不同的任务合并成一个任务，这样就只需要运行一个合并后的任务，
相应的工具就可以自动帮你一个个的运行这些预先定义好的子任务，如下面这个工作流你可能会在某个 gruntfile 中见到：

```
build:
  -> clean        # 清空上次发布的文件夹
  -> slim         # 将 .slim 文件转化成 .html
  -> sass         # 将 .sass 文件转化成 .css 文件
  -> browserify   # 将 CommonJS 的 js 模块打包成浏览器可以使用的 js 脚本
  -> concat       # 合并多个 js 文件成一个
  -> cssmin       # 压缩 css 文件
  -> htmlmin      # 压缩 html 文件
  -> uglify       # 压缩 js 文件
  -> imagemin     # 压缩图片文件
```


随着项目的成长，工作流变的越来越大，对应的配置文件中的 task 也变的越来越多，越来越复杂，
另一方面，如果需要开启一个新项目，又得对这个新项目再配置一次工作流。
要知道，程序员是懒惰的，能用工具自动解决的问题，他们就不会手动去处理。
所以 [yeoman][yeoman] 和 [brunch][brunch] 这类脚手架平台就起来了，
当我们用 grunt 或 gulp 或 webpack 搭好了一个项目，就可以把这个项目的工作流做个简单的封装，
然后发布到 yeoman 或 brunch 上，下次我们需要再做一个类似的项目时，
就只需要用 yeoman 或 brunch 将上次封装的项目重新安装一遍，就会自动搭好新项目的工作流环境。
但是，就像上面说的，工作流虽然不会经常变，但随着项目的变化，工作流偶尔也会变化，
与其用 yeoman 或 brunch 制作好的脚手架，还不如复制上次项目中的工作流配置文件来创建一个新项目来的快，
所以 yeoman 或 brunch 这类平台并不是银弹，它们发展的也是不愠不火。

可以看到，国外工作流类工具的思路多是以平台为主，用户自己在平台上安装自己所需要的插件；
而在国内，更多注重的是“[前端集成解决方案](gh_search_result)”，
即由工具帮你把你开发中可能需要用到的插件都集成起来，你只需要运行工具预先定义好的命令就行了，
这样你就不需要去考虑安装哪些插件，又怎么配置这些插件。
百度出的 [fis][fis] 就是一个集成解决方案的代表，京东也开源了他们的集成开发环境 [jdf][jdf]，
而 hao123 利用百度的 fis 制作出了适合它们的集成开发环境 [her][her]。
这类集成解决方案的优点就是不需要用户去操心装什么插件，只需要知道有哪些命令可以用，如何配置就行了，如果集成度高的话，有时配置都不需要了；
同时有个我认为比较重要的缺点就是 **适用性有限**，前端环境复杂多变了，很难保证一个工具可以适用于前端的各类开发环境，
虽然也可以通过插件机制解决一些问题，但毕竟集成度高，扩展性必然就会低。

其实，不管是 grunt, gulp, webpack 这类自建工作流的平台，还是 yeoman, brunch 这类搭建脚手架的平台，还是像 fis 这样的集成解决方案，它们都是为解决前端开发工作流而生的。
我们一直在讨论这些上层的工具，却忽略了低层的工作流。
那前端开发工作流中会有哪些子任务呢？
我们是否可以用一个工具来解决一些通用的流程呢？
下图展示了两个常见的工作流，一个是开发流，一个是发布流。


```
# 开发流
watch -> lint -> test -> preprocess -> 浏览器上查看效果

# 发布流
lint -> test -> preprocess -> min -> rev -> deploy
                   ╎           ╎      ╎ 
                   ╎           ╎      └ 给文件名加 hash
                   ╎           ╎ 
                   ╎           ╎ 
                   ╎           └ html/css/js/image 的压缩
                   ╎ 
                   ├ html: jade/slim/haml/...
                   ├ css:  sass/less/stylus/...
                   ├ js:   coffee/es6/jsx/typescript/...
                   └ 其它:  autoprefix/postcss/...
```


从上图中可以看出，其实在前端开发流程中，主要就这么几个 task：

  - `lint`: 主要就是检查下源代码的语法规范，这一块相对比较简单，主要把一些检查规则配置好就行了；
    不过由于公司或个人的语法规范一般是固定的，不会改变，所以现在流行的做法是，为自己或公司封装好一个检查语法规范的工具，
    比如 [standard](https://github.com/feross/standard) 或 [xo](https://github.com/sindresorhus/xo) 项目，
    这样用户只需要运行一个命令就可以 lint，而不用再去考虑配置文件；
    我也封装了一个我自己的语法规范检查工具 [check-style](https://github.com/qiu8310/check-style) 以及公司级的语法规范检查工具 [hj-check-style](https://github.com/Hujiang-FE/hj-check-style)
  - `test`: 不同的项目，使用的测试工具一般也不一样，这个不太好统一，但不同的测试工具都会提供一个简单的命令，
    所以要使用也很简单，关键是写测试，具我了解，因内前端一般是不写测试的
  - `preprocess`: 这一块的任务就比较复杂了，不同的用户的喜好、不同的项目的架构，都会导致使用的工具不一样，
    所以很难统一起来
  - `min`: 这一块流程就相对简单了，主要就是对静态资源压缩，不过有一点要注意的是，有些 html 文件是后端渲染的出来的，
    所以此类系统中 html 是无法压缩的，但其它的像 css/js/image 文件一般是不会由后端渲染出来，所以对它们处理方式都是一样的
  - `rev`: 这一块就更简单了，不管对什么文件, rev 之后得到的新文件名应该是固定的，所以此步骤也是可以统一的
  - `deploy`: 这一块也简单，不过是将一批文件上传到服务器上去，只是上传方式可能不一样

通过上面的分析，lint 完全可以用一个工具来解决，不用任何配置，而 test 和 preprocess 和项目关系比较紧，很难统一起来，
而 min, rev 和 deploy 这三个步骤基本上是和项目无关的(除了某些项目中的 html 是动态渲染出来的)，只和文件有关，
所以我就写了这个 deploy-asset 来解决任意一个项目的 min, rev 和 deploy 的问题。

有了 deploy-asset 和自己特有的 lint 工具，那么一个前端开发流就被砍的只剩下 test 和 preprocess 了，
这样就只需要专注于用 grunt, gulp 或 webpack 去写 test 和 preprocess 两大任务！


欢迎继续阅读[《deploy-asset 执行流程》](./Flow.md)


[gh_search_result]: https://github.com/search?utf8=%E2%9C%93&q=%E5%89%8D%E7%AB%AF%E9%9B%86%E6%88%90%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88&type=Repositories&ref=searchresults

[grunt]: http://gruntjs.com/
[gulp]: http://gulpjs.com/
[broccoli]: https://github.com/broccolijs/broccoli
[webpack]: http://webpack.github.io/
[yeoman]: http://yeoman.io/
[brunch]: http://brunch.io/

[fis]: https://github.com/fex-team/fis
[her]: https://github.com/hao123-fe/her
[jdf]: https://github.com/putaoshu/jdf


