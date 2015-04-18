/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */


/**
 * 文件匹配模式，参考自 {@link https://github.com/yeoman/grunt-usemin/blob/v3.0.0/lib/fileprocessor.js#L8-96 grunt-usemin}
 *
 * 每个模式中的 type 表示匹配到的文件的类型，有以下 6 种类型：
 *
 *   - `html`   HTML 文件
 *   - `js`     脚本文件
 *   - `css`    样式文件
 *   - `json`   JSON 文件
 *   - `static` 静态文件，除了以上四种文件外，包括 图片、视频、音频、TXT 文件等
 *   - `unknown` 无法判断文件的类型，可以是以上五种文件中的任意一种，处理这种文件一般就根据后缀名来判断其类型了
 *
 * exists 属性表示这个文件需要存在，如果指定的文件不存在，
 * 先确认它不是 remote 文件，再确认路径中没有动态参数像 {{}}、<%%> 等，
 * 确认无误就报错了（错误可以通过选项 force 屏蔽）。
 *
 * relative 属性表示此规则是否允许文件使用相对路径来替换远程资源
 *
 * @name patterns
 * @private
 * @type {Object}
 */
module.exports = {
  html: [
    {
      type: 'js',
      relative: true,
      re: /<script.+src=['"]([^"']+)["']/gm,
      msg: '查找文件中的 JS 文件',
      exists: true
    },
    {
      type: 'css',
      relative: true,
      re: /<link[^\>]+href=['"]([^"']+)["']/gm,
      msg: '查找文件中的 CSS 文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<img[^\>]*[^\>\S]+src=['"]([^"']+)["']/gm,
      msg: '查找文件中的 img 标签中的文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<video[^\>]+src=['"]([^"']+)["']/gm,
      msg: '查找文件中的 video 标签中的 src 文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<video[^\>]+poster=['"]([^"']+)["']/gm,
      msg: '查找文件中的 video 标签中的 poster 文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<source[^\>]+src=['"]([^"']+)["']/gm,
      msg: '查找文件中的 source 标签中的文件',
      exists: true
    },
    {
      type: 'js',
      relative: true,
      re: /data-main=['"]([^"']+)['"]/gm,
      msg: '查找 require.js 指定的 data-main 属性中的 js 文件',
      inFilter: function(m) { return /\.js$/.test(m) ? m : m + '.js'; },
      outFilter: function(m) { return m.replace(/\.js$/, ''); }
    },
    {
      type: 'unknown',
      re: /data-(?!main)[-\w]+=['"]([^'"]+)['"]/gm,
      msg: '查找其它 data-* 属性中的资源文件'
    },
    {
      type: 'static',
      relative: true,
      re: /url\(\s*['"]?([^"'\)]+)["']?\s*\)/gm,
      msg: '查找文件中内嵌的 style 中的资源文件'
    },
    {
      type: 'unknown',
      relative: true,
      re: /<a[^\>]+href=['"]([^"']+)["']/gm,
      msg: '查找文件中 a 标签引用的文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<input[^\>]+src=['"]([^"']+)["']/gm,
      msg: '查找文件中 input 标签中引用的文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<meta[^\>]+content=['"]([^"']+)["']/gm,
      msg: '查找文件中的 meta 标签中的图片文件'
    },
    {
      type: 'static',
      relative: true,
      re: /<object[^\>]+data=['"]([^"']+)["']/gm,
      msg: '查找文件中的 object 标签中的文件',
      exists: true
    },
    {
      type: 'static',
      re: /<image[^\>]*[^\>\S]+xlink:href=['"]([^"']+)["']/gm,
      msg: '查找文件中的新的 image 标签中 xlink:href 所指定的 svg 文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<image[^\>]*[^\>\S]+src=['"]([^"']+)["']/gm,
      msg: '查找文件中的新的 image 标签中的 src 所指定的文件',
      exists: true
    },
    {
      type: 'static',
      relative: true,
      re: /<(?:img|source)[^\>]*[^\>\S]+srcset=['"]([^"'\s]+)\s*?(?:\s\d*?[w])?(?:\s\d*?[x])?\s*?["']/gm,
      msg: '查找文件中的 img 或 source 标签的 srcset 所指定的文件',
      exists: true
    },
    {
      type: 'static',
      re: /<(?:use|image)[^\>]*[^\>\S]+xlink:href=['"]([^"']+)["']/gm,
      msg: '查找文件中的 use 或 image 标签所引用的外部文件',
      exists: true
    }
  ],
  js: [
    {
      type: 'unknown',
      re: /['"]([^'"]+[\\\/][^'"]+\.\w+)['"]/gm,  // JS 中字符串比较多，所以需要满足两个条件，1：含有路径，2：含有 .xx
      msg: '查找 JS 中引用的文件（比如 angular 的路由中经常出现 html 文件）'
    }
  ],
  css: [
    {
      type: 'static',
      relative: true,
      re: /(?:src=|url\(\s*)['"]?([^'"\)\(\?\|#)]+)['"]?\s*\)?/gm,
      msg: '查找 CSS 中引用的资源文件',
      exists: true
    }
  ],
  json: [
    {
      type: 'unknown',
      re: /:\s*['"]([^'"]+[\\\/][^'"]+\.\w+)["']/gm,  // JSON 中字符串比较多，所以需要满足两个条件，1：含有路径，2：含有 .xx
      msg: '查找 JSON 中引用的文件'
    }
  ]
};
