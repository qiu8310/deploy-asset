#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var os = require('os');
var path = require('x-path');
var program = require('commander');

program
  .version(require(require('path').join(__dirname, 'package.json')).version)
  .usage('[options] <directory_or_globPatterns>')
  .description('Deploy the directory\'s static files to supported server (Only support qiniu for now).')

  .option('-i, --includes <globPatterns>', 'Include files, support glob pattern')
  .option('--excludes <excludes>', 'Exclude files, support glob pattern')
  .option('--unbroken <unbrokenFiles>', 'Unbroken files, support glob pattern')
  .option('-u --uploader <uploader>', 'Specified the uploader')
  .option('-d, --deep <deep>', 'Set opts.deep to a specific number', parseInt)
  .option('--limit <eachUploadLimit>', 'The max concurrent upload files number', parseInt)
  .option('--hash <rename>', 'Files basename postfix hash chars length', parseInt)
  .option('-p, --prefix <prefix>', 'Files basename prefix string')
  .option('-o, --out-dir <outDir>', 'Output all uploaded file in local')

  .option('--force', 'Disable throws error when assets not exist while they should exist')
  .option('--dry', 'Don\'t upload, just output the result')

  .option('--html-exts <htmlExts>', 'Set html file extensions for detect file\'s type')
  .option('--json-exts <jsonExts>', 'Set json file extensions for detect file\'s type')
  .option('--js-exts <jsExts>', 'Set js file extensions for detect file\'s type')
  .option('--css-exts <cssExts>', 'Set css file extensions for detect file\'s type')

  .option('-l, --log-level <logLevel>', 'Set log level, support: silly, verbose, info, warn, error, silent')
  .option('--verbose', 'Set log level to verbose')
  .option('--silent', 'Set log level to silent')
  .option('--info', 'Set log level to info')

  .option('-c, --config-file <configFile>', 'Use specified config file')
  .parse(process.argv);


var opts = {};
var map = { unbroken: 'unbrokenFiles', limit: 'eachUploadLimit', hash: 'rename' };

if (program.configFile) { _.assign(opts, require(program.configFile)); }

if (/da(?:\:(\*|\w+))/.test(process.env.DEBUG)) { opts.logLevel = RegExp.$1 !== '*' && RegExp.$1 || 'verbose'; }

('deep,excludes,unbrokenFiles,force,dry,uploader,eachUploadLimit,htmlExts' +
'jsExts,cssExts,jsonExts,rename,outDir,prefix').split(',').forEach(function(key) {
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

if (program.includes) { globPatterns.push(program.includes); }

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
