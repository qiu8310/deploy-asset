#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var os = require('os');
var path = require('x-path');
var program = require('commander');

program
  .version(require(require('path').join(__dirname, 'package.json')).version)
  .usage('[options] <directory> <globPatterns>')
  .description('Deploy the directory\'s static files to supported server (Only support qiniu for now).' +
    '\r\n  More detail about options on: https://qiu8310.github.io/deploy-asset/global.html#da')

  .option('-i, --includes <globPatterns>', 'include files, support glob pattern')
  .option('--excludes <excludes>', 'excludes files, support glob pattern')
  .option('--absolute <useAbsoluteRefFiles>', 'use absolute asset path in these files, support glob pattern')
  .option('--unbroken <unbrokenFiles>', 'upload these files but not inspect, support glob pattern')

  .option('-u --uploader <uploader>', 'specified the uploader')
  .option('-d, --deep <deep>', 'set directory\'s deep, default is 0', parseInt)
  .option('--limit <eachUploadLimit>', 'the max concurrent upload files number', parseInt)
  .option('--hash <rename>', 'how many hash chars append to file basename', parseInt)
  .option('-p, --prefix <prefix>', 'append a string to file basename')
  .option('-o, --out-dir <outDir>', 'output all uploaded file in local directory')

  .option('--force', 'disable throws error when assets not exist while they should exist')
  .option('--dry', 'don\'t upload, just output the result')

  .option('--html-exts <htmlExts>', 'set html file extensions for detect file\'s type')
  .option('--json-exts <jsonExts>', 'set json file extensions for detect file\'s type')
  .option('--js-exts <jsExts>', 'set js file extensions for detect file\'s type')
  .option('--css-exts <cssExts>', 'set css file extensions for detect file\'s type')

  .option('-l, --log-level <logLevel>', 'set log level, support: silly, verbose, profiler, info, warn, error, silent')
  .option('--verbose', 'set log level to verbose')
  .option('--silent', 'set log level to silent')
  .option('--info', 'set log level to info')

  .option('-c, --config-file <configFile>', 'use specified config file, default config file is `.darc`')
  .parse(process.argv);


var opts = {};
var map = { unbroken: 'unbrokenFiles', limit: 'eachUploadLimit', hash: 'rename', absolute: 'useAbsoluteRefFiles' };

if (program.configFile) { _.assign(opts, require(program.configFile)); }

if (/(?:^|,)da(?:\:(\*|\w+))/.test(process.env.DEBUG)) { opts.logLevel = RegExp.$1 !== '*' && RegExp.$1 || 'verbose'; }

('deep,includes,excludes,unbroken,absolute,force,dry,uploader,limit,htmlExts' +
'jsExts,cssExts,jsonExts,hash,outDir,prefix').split(',').forEach(function(key) {
    if ((key in program) && program[key] === program[key]) {
      opts[map[key] || key] = program[key];
    }
  }
);

['verbose', 'silent', 'info'].forEach(function(key) { if (key in program) { opts.logLevel = key; } });
if (!_.isString(opts.outDir)) { opts.outDir = false; }


var arg = program.args[0];
var dir, globPatterns;
if (arg && path.isDirectorySync(arg)) {
  dir = arg;
  globPatterns = program.args.slice(1);
} else {
  dir = '.';
  globPatterns = program.args.slice(0);
}

require('./')(dir, globPatterns, opts, function(err, all) {
  if (err) {
    console.error(err);
  } else {
    if (_.size(all)) {
      var max  = _.max(all, function(f) { return f.path.length; }).path.length;
      var fill = function (str) {
        return str + (new Array(max - str.length + 3)).join(' ');
      };
      console.log(os.EOL);
      _.each(all, function(f) {
        console.log(fill(f.path) + '=>  ' + f.remote.path);
      });
      console.log(os.EOL);
    }
  }
});
