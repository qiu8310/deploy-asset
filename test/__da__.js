import FtpServer from 'ftp-test-server';

var FTP = require('jsftp-mkdirp')(require('jsftp-for-deploy-asset'));


let ftpServer = new FtpServer();
let opts = {
  host: 'localhost',
  user: 'abc',
  pass: '1ksdjfk',
  port: 9472
};


ftpServer.init(opts);

try {
  let ftp = new FTP(opts);
} catch (e) {
  console.log(e.message);
}






// var path = require('path');
// var da = require('./../src/da');


// var root = path.join(__dirname, '../test/fixtures/basic');

// da(root + '/index.html', {
//   logLevel: 'info',
//   dry: true,
//   flat: false,
//   stack: false,
//   baseUrl: 'a.com',
//   runToStep: 'upload',
//   hash: 8,
//   overwrite: true,
//   ignoreDependsError: true,
//   ignoreUploadError: true,
//   noIncludePatterns: false,
//   noUploadPatterns: 'cli.*'
// }, function (err) {
//   if (err) console.log(err.stack);
// });

