#!/usr/bin/env node

var coveralls = require('coveralls');

process.stdin.resume();
process.stdin.setEncoding('utf8');

var input = '';

process.stdin.on('data', function (chunk) {
  input += chunk;
});

process.stdin.on('end', function () {
  coveralls.getOptions(function (err, opts) {
    if (err) throw err;

    coveralls.convertLcovToCoveralls(input, opts, function (err, data) {
      if (err) throw err;
      // 不上报 data 到远程了
    });

  });
});
