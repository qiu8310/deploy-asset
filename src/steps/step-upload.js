import async from 'async';
import ylog from 'ylog';
import util from '../util';

export default function (files, opts, done) {
  try {

    util.banner('开始上传');

    let uploader = opts.uploader;
    ylog.verbose('同时上传文件的个数为 ^%s^', opts.concurrence);


    let uploadingCount = 0;
    let uploadError = false;

    let upload = (file, nextFile) => {
      uploadingCount++;

      file.upload(err => {
        uploadingCount--;
        if (!uploadingCount) {
          ylog.setLevel(opts.logLevel);
          if (uploadError) {
            done(uploadError, files);
            uploadError = false;
          }
        }
        nextFile(err);
      });
    };

    let finish = (err) => {
      if (err && uploadingCount) {
        uploadError = err;
        ylog.setLevel('silent');
      } else {
        done(err, files);
      }
    };

    uploader.run(end => async.eachLimit(files, opts.concurrence, upload, end), finish);

  } catch (e) { done(e); }
}
