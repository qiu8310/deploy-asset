import async from 'async';
import ylog from 'ylog';
import util from '../util';

export default function (files, opts, done) {
  try {

    util.banner('开始上传');

    let uploader = opts.uploader;
    let uploadingCount = 0;
    let uploadingError;

    let endStep = (err) => {
      if (err && uploadingCount !== 0) {
        uploadingError = err;
        return false;
      }
      done(err, files, opts);
    }

    ylog.verbose('同时上传文件的个数为 ^%s^', opts.concurrence);

    let upload = (file, nextFile) => {
      uploadingCount++;
      file.upload(err => {
        uploadingCount--;
        if (uploadingCount === 0 && uploadingError) {
          done(uploadingError);
        }
        nextFile(err);
      });
    };

    uploader.run(
      endUpload => async.eachLimit(files, opts.concurrence, upload, endUpload),
      endStep
    );

  } catch (e) { done(e); }
}
