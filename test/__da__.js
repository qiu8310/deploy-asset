require('babel/register');

var path = require('path');
var da = require('./../src/da');


var root = path.join(__dirname, '../test/fixtures/basic');

da(root + '/index.html', {
  logLevel: 'info',
  dry: true,
  flat: false,
  stack: false,
  baseUrl: 'a.com',
  runToStep: 'upload',
  hash: 8,
  overwrite: true,
  ignoreDependsError: true,
  ignoreUploadError: true,
  noIncludePatterns: false,
  noUploadPatterns: 'cli.*'
}, function (err) {
  if (err) console.log(err.stack);
});

