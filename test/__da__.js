import FtpServer from 'ftp-test-server';

var FTP = require('ftp');


let ftpServer = new FtpServer();
let opts = {
  host: 'localhost',
  user: 'abc',
  pass: '1ksdjfk',
  password: '1ksdjfk',
  port: 9472
};


ftpServer.init(opts);

// ftpServer.on('stdout', function(data) {
//   console.log(data.toString());
// });

// ftpServer.on('stderr', function(data) {
//   console.log('ERROR', data.toString());
// })

let ftp = new FTP();

ftp.connect(opts);
ftp.on('error', (err) => {
  console.log(err);
});
ftp.on('ready', () => {
  // console.log('ready');
  // ftp.mkdir('aa/aa', true, (err, res) => {
  //   console.log('-----aa:', err);
  // });
  // ftp.mkdir('bb', (err, res) => {
  //   console.log('-----bb:', err);
  // });
});













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

