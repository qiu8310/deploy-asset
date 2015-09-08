#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var os = require('os');
var path = require('x-path');
var fs = require('fs-extra');
var mkdirp = require('mkdirp').sync;
var program = require('commander');

program
  .version(require(require('path').join(__dirname, 'package.json')).version)
  .usage('[options] <directory> <globPatterns>')
  .description('Deploy the directory\'s static files to supported server (support qiniu/ftp/upyun for now).' +
    '\r\n  More detail about options on: https://qiu8310.github.io/deploy-asset/global.html#da')

  .option('-i, --includes <globPatterns>', 'include files, support glob pattern')
  .option('--excludes <excludes>', 'excludes files, support glob pattern')
  .option('--absolute <useAbsoluteRefFiles>', 'use absolute asset path in these files, support glob pattern')
  .option('--unbroken <unbrokenFiles>', 'upload these files but not inspect, support glob pattern')
  .option('--unupload <unuploadFiles>', 'these files will be inspected but not uploaded, support glob pattern')

  .option('-u --uploader <uploader>', 'specified the uploader')
  .option('-d, --deep <deep>', 'set directory\'s deep, default is 0', parseInt)
  .option('--limit <eachUploadLimit>', 'the max concurrent upload files number', parseInt)
  .option('--hash <rename>', 'how many hash chars append to file basename', parseInt)
  .option('-p, --prefix <prefix>', 'append a string to file basename')
  .option('-o, --out-dir <outDir>', 'output all uploaded file in local directory')

  .option('--map-path <newFilePath>', 'output local file and remote file\'s relation to a json file')
  .option('--map-local-path <newFilePath>', 'output local file paths to a json file')
  .option('--map-remote-path <newFilePath>', 'output remote file paths to a json file')

  .option('--force', 'disable throws error when assets not exist while they should exist')
  .option('--dry', 'don\'t upload, just output the result')

  .option('--html-exts <htmlExts>', 'set html file extensions for detect file\'s type')
  .option('--json-exts <jsonExts>', 'set json file extensions for detect file\'s type')
  .option('--js-exts <jsExts>', 'set js file extensions for detect file\'s type')
  .option('--css-exts <cssExts>', 'set css file extensions for detect file\'s type')

  .option('-l, --log-level <logLevel>', 'set log level, support: silly, verbose, profiler, info, warn, error, silent')
  .option('--no-home-log', 'disable log uploaded files to home directory named .da_log')
  .option('--verbose', 'set log level to verbose')
  .option('--silent', 'set log level to silent')
  .option('--info', 'set log level to info')

  .option('-c, --config-file <configFile>', 'use specified config file, default config file is `.darc`')
  .parse(process.argv);


var opts = {};
var map = { unbroken: 'unbrokenFiles', unupload: 'unuploadFiles', limit: 'eachUploadLimit', hash: 'rename', absolute: 'useAbsoluteRefFiles' };

if (program.configFile) { _.assign(opts, require(program.configFile)); }

if (/(?:^|,)da(?:\:(\*|\w+))/.test(process.env.DEBUG)) { opts.logLevel = RegExp.$1 !== '*' && RegExp.$1 || 'verbose'; }

('deep,includes,excludes,unbroken,unupload,absolute,force,dry,uploader,limit,htmlExts' +
'jsExts,cssExts,jsonExts,hash,outDir,prefix,logLevel').split(',').forEach(function(key) {
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

function write(filePath, data) {
  mkdirp(path.dirname(filePath));
  fs.writeJsonFileSync(filePath, data);
  console.log('Write to ' + path.resolve(filePath) + ' ok!\r\n');
}

require('./')(dir, globPatterns, opts, function(err, all) {
  if (err) {
    console.error(err.stack || err);
  } else {
    if (_.size(all)) {
      var max  = _.max(all, function(f) { return f.path.length; }).path.length;
      var fill = function (str) {
        return (new Array(max - str.length + 2)).join(' ') + str;
      };
      console.log(os.EOL);
      var outMap = {}, logMap = {};
      _.each(all, function(f) {
        var remote = f.uploaded ? f.remote.path : '(Not uploaded)';
        outMap[f.path] = remote;
        logMap[path.resolve(f.path)] = remote;

        console.log((f.uploaded ? ' ✓ ' : ' ■ ') + fill(f.path) + ' => ' + remote);
      });
      console.log(os.EOL);

      if (!program.noHomeLog) {
        var daLogDir = path.join(path.homedir(), '.da_log');
        fs.ensureDirSync(daLogDir);
        write(path.join(daLogDir, Date.now() + '.log.json'), logMap);
      }

      if (program.mapLocalPath) {
        write(program.mapLocalPath, _.keys(outMap));
      } else if (program.mapRemotePath) {
        write(program.mapRemotePath, _.values(outMap));
      } else if (program.mapPath) {
        write(program.mapPath, outMap);
      }
    }
  }
});
