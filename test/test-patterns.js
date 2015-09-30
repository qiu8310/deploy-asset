import util from './lib/util';

describe('Patterns', () => {
  util.daTest({

    'HTML': {
      '找到 html 文件中引用的所有资源': {
        any: 'patterns/index.html',
        cb(err, files) {
          util.assert.ok(!err);
          let all = ['index.html',
            'res/a.js', 'res/b.js', 'res/c.js',
            'res/a.css', 'res/b.css', 'res/c.css',
            'res/a.png', 'res/b.png', 'res/c.png'];

          files.length.should.eql(all.length);
          files.forEach(f => all.indexOf(f.relativePath).should.above(-1));
        }
      }
    },
    'JSON': {
      '找到 json 文件中引用的所有资源': {
        any: 'patterns/index.json',
        cb(err, files) {
          util.assert.ok(!err);
          let all = ['index.json', 'res/a.js'];
          files.length.should.eql(all.length);
          files.forEach(f => all.indexOf(f.relativePath).should.above(-1));
        }
      }
    },
    'JS': {
      '找到 js 文件中引用的所有资源': {
        any: 'patterns/index.js',
        cb(err, files) {
          util.assert.ok(!err);
          let all = ['index.js', 'res/a.js'];
          files.length.should.eql(all.length);
          files.forEach(f => all.indexOf(f.relativePath).should.above(-1));
        }
      }
    },
    'CSS': {
      '找到 css 文件中引用的所有资源': {
        any: 'patterns/index.css',
        cb(err, files) {
          util.assert.ok(!err);
          let all = ['index.css', 'res/a.png'];
          files.length.should.eql(all.length);
          files.forEach(f => all.indexOf(f.relativePath).should.above(-1));
        }
      }
    }


  });
});
