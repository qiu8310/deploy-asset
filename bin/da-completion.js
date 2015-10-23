var options = require('./da-options');

function keyToCliOption(key) {
  return key.length === 1 ? '-' + key : '--' + key;
}

module.exports = function (yargs) {

  // 可以用 `da --get-yargs-completions -a -c d` 去调试

  return yargs.completion('completion', '生成 Bash 的自动补全脚本', function (current, argv) {
    // 'current' is the current command being completed.
    // 'argv' is the parsed arguments so far.
    // simply return an array of completions.

    var filter = [];
    var all = [];
    var matched = false;

    Object.keys(options).forEach(function (key) {
      var value = argv[key];

      if (/^[a-zA-Z]/.test(key) && value === options[key].default) {

        key = keyToCliOption(key);
        all.push(key);

        if (key === current) {
          matched = true;
        } else if (key.indexOf(current) === 0) {
          filter.push(key);
        }
      }
    });

    return matched ? filter : all;
  });


};
