import async from 'async';
import ylog from 'ylog';
import util from '../util';

export default function (files, opts, done) {
  try {

    util.banner('开始上传');

    let uploader = opts.uploader;
    ylog.verbose('同时上传文件的个数为 ^%s^', opts.concurrence);

    let upload = (file, nextFile) => {
      file.upload(nextFile);
    };

    uploader.run(
      end => async.eachLimit(files, opts.concurrence, upload, end),
      err => done(err, files, opts)
    );

  } catch (e) { done(e); }
}
