module.exports = function (yargs) {

  // 可以用 `da --get-yargs-completions -a -c d` 去调试

  return yargs.completion('completion', '生成 Bash 的自动补全脚本', function(current, argv) {
    // 'current' is the current command being completed.
    // 'argv' is the parsed arguments so far.
    // simply return an array of completions.
    return [
      '-ac',
      'foo',
      'bar'
    ];
  });


};
