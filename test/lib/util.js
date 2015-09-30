import Uploader from '../../src/uploaders/Uploader';
import File from '../../src/File';
import ylog from 'ylog';
import path from 'x-path';
import slash from 'slash';
import assert from 'should';
import async from 'async';
import _ from 'lodash';
import da from '../../src/da';

ylog.setLevel('silent');

let testDir = path.dirname(__dirname);
let fixturesDir = path.join(testDir, 'fixtures');
let f = (base) => { return path.unifyPathSeparate(path.join(fixturesDir, base)); };


export default {
  da(any, opts, callback = null) {
    if (typeof opts === 'function') [callback, opts] = [opts, callback];
    opts = opts || {};
    let hooks = opts.hooks || {};
    delete opts.hooks;
    if (opts.uploaderOpts && !opts.uploaderName) opts.uploaderName = 'mock';
    if (!opts.uploaderName) opts.uploader = Uploader.instance('mock', {hooks});
    opts.logLevel = 'logLevel' in opts ? 'verbose' : 'silent';
    if (typeof any === 'string') any = f(any);
    else if (Array.isArray(any)) any = any.map(a => {return typeof a === 'string' ? f(a) : a});
    da(any, opts, callback);
  },

  daTest(suits) {
    _.each(suits, (suit, ctx) => {
      let suitTest = suit.only ? context.only.bind(context) : context;
      delete suit.only;

      suitTest(ctx, () => {

        _.each(suit, (opts, k) => {

          let dftOpts = {baseUrl: 'a.cn'};
          let any = opts.any || 'basic';
          let cb = opts.cb;
          let only = opts.only;

          let common = opts.common;
          let tests = opts.tests;

          delete opts.common;
          delete opts.only;
          delete opts.tests;
          delete opts.any;
          delete opts.cb;

          opts = _.assign({}, dftOpts, common, opts);

          if (!tests) tests = [opts];
          else tests = tests.map(t => _.assign({}, opts, t));


          let test = only ? it.only.bind(it) : it;

          test(k, (done) => {

            async.eachSeries(tests, (opts, next) => {

              this.da(opts.any || any, opts, (err, files, daOpts) => {
                if (opts.cb || cb) (opts.cb || cb)(err, files, daOpts, opts);
                next();
              });

            }, () => done());

          });
        });


      });


    });
  },

  f,
  assert,
  testDir,
  fixturesDir,

  /**
   * @returns {File}
   */
  file(base, uploader, opts = {}) {
    let filePath = path.join(fixturesDir, base);
    let baseRoot = slash(base).split('/').shift();
    opts.uploader = uploader || 'mock';
    return new File(filePath, path.join(fixturesDir, baseRoot), opts);
  },

  mute() { ylog.setLevel('silent'); },
  unmute(level = 'info') { ylog.setLevel(level) }
};
