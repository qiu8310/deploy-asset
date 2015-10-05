/*
 * deploy-asset
 * https://github.com/qiu8310/deploy-asset
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

/**
 * @typedef {Object} Pattern
 * @prop {RegExp} re - 用于匹配文件的正则表达式
 * @prop {String} type - 此正则表达式匹配到的文件的类型，如果无法确定，则指定为 unknown
 * @prop {String} msg - 解释此正则的意思的一段话
 * @prop {Function} [inFilter] - 匹配到的字符串转化成 assetPath 之前要用此函数处理
 * @prop {Function} [outFilter] - 生成的新的 assetPath 在替换原字符串时要用此函数处理
 * @prop {Boolean} [exists = false] - 如果为 true，表示此静态资源必须存在，否则无所谓存不存在
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
 * CSS 文件中的静态资源中的后缀不要去掉，像字体这些文件，加上 ? 或 # 是为了兼容性
 *
 * @name patterns
 * @private
 * @type {Object}
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = {
  html: [{
    type: 'js',
    re: /<script[^\>]+src=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 JS 文件',
    exists: true
  }, {
    type: 'css',
    re: /<link[^\>]+href=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 CSS 文件',
    exists: true
  }, {
    type: 'static',
    re: /<img[^\>]*[^\>\S]+src=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 img 标签中的文件',
    exists: true
  }, {
    type: 'static',
    re: /<video[^\>]+src=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 video 标签中的 src 文件',
    exists: true
  }, {
    type: 'static',
    re: /<video[^\>]+poster=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 video 标签中的 poster 文件',
    exists: true
  }, {
    type: 'static',
    re: /<source[^\>]+src=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 source 标签中的文件',
    exists: true
  }, {
    type: 'js',
    re: /data-main=['"]([^"']+)['"]/gm,
    msg: '查找 html 文件中 require.js 指定的 data-main 属性中的 js 文件',
    inFilter: function inFilter(m) {
      return (/\.js$/.test(m) ? m : m + '.js'
      );
    },
    outFilter: function outFilter(m) {
      return m.replace(/\.js$/, '');
    }
  }, {
    type: 'unknown',
    re: /data-(?!main)[-\w]+=['"]([^'"]+)['"]/gm,
    msg: '查找 html 文件中其它 data-* 属性中的资源文件'
  }, {
    type: 'static',
    re: /url\(\s*['"]?([^"'\)]+)["']?\s*\)/gm,
    msg: '查找 html 文件中内嵌的 style 中的资源文件'
  }, {
    type: 'unknown',
    re: /<a[^\>]+href=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中 a 标签引用的文件',
    exists: true
  }, {
    type: 'static',
    re: /<input[^\>]+src=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中 input 标签中引用的文件',
    exists: true
  }, {
    type: 'static',
    re: /<meta[^\>]+content=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 meta 标签中的图片文件'
  }, {
    type: 'static',
    re: /<object[^\>]+data=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 object 标签中的文件',
    exists: true
  }, {
    type: 'static',
    re: /<image[^\>]*[^\>\S]+xlink:href=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的新的 image 标签中 xlink:href 所指定的 svg 文件',
    exists: true
  }, {
    type: 'static',
    re: /<image[^\>]*[^\>\S]+src=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的新的 image 标签中的 src 所指定的文件',
    exists: true
  }, {
    type: 'static',
    re: /<(?:img|source)[^\>]*[^\>\S]+srcset=['"]([^"'\s]+)\s*?(?:\s\d*?[w])?(?:\s\d*?[x])?\s*?["']/gm,
    msg: '查找 html 文件中的 img 或 source 标签的 srcset 所指定的文件',
    exists: true
  }, {
    type: 'static',
    re: /<(?:use|image)[^\>]*[^\>\S]+xlink:href=['"]([^"']+)["']/gm,
    msg: '查找 html 文件中的 use 或 image 标签所引用的外部文件',
    exists: true
  }],
  js: [{
    type: 'unknown',
    re: /['"]([^'"]+[\\\/][^'"]+\.\w+)['"]/gm, // JS 中字符串比较多，所以需要满足两个条件，1：含有路径，2：含有 .xx
    msg: '查找 js 文件中引用的文件（比如 angular 的路由中经常出现 html 文件）'
  }],
  css: [{
    type: 'static',
    re: /(?:src=|url\(\s*)['"]?([^'"\)\(\?\|#)]+)['"]?\s*\)?/gm,
    msg: '查找 css 文件中引用的资源文件',
    exists: true
  }],
  json: [{
    type: 'unknown',
    re: /:\s*['"]([^'"]+[\\\/][^'"]+\.\w+)["']/gm, // JSON 中字符串比较多，所以需要满足两个条件，1：含有路径，2：含有 .xx
    msg: '查找 json 文件中引用的文件'
  }]
};
module.exports = exports['default'];