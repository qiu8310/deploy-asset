var os = require('os');

module.exports = {
  rootDir: {
    alias: 'r',
    desc: '指定要部署的文件的根目录，如果没有指定任何文件或文件夹，则会把当前文件夹当作 rootDir',
    requiresArg: true,
    type: 'string'
  },

  noRootHtml: {
    desc: '不上传根目录下的 HTML 文件，这是组合选项：相当于指定 `--abs *.html --nupl *.html --outDir out`',
    type: 'boolean'
  },
  noAllHtml: {
    desc: '不上传所有 HTML 文件，这是组合选项：相当于指定 `--abs **/*.html --nupl **/*.html --outDir out',
    type: 'boolean'
  },

  '  远程环境': { desc: ' ' },

  destDir: {
    desc: '指定要部署到的远程服务器的目录',
    requiresArg: true,
    type: 'string'
  },
  baseUrl: {
    alias: 'domain',
    desc: '指定远程服务器的域名或基准URL',
    requiresArg: true,
    type: 'string'
  },
  appendDestDirToBaseUrl: {
    alias: 'adb',
    desc: '将远程服务器目录的路径附加到 baseUrl 上',
    type: 'boolean',
    'default': true
  },
  prefix: {
    alias: 'p',
    desc: '指定远程文件名称的前缀',
    type: 'string'
  },
  suffix: {
    alias: 's',
    desc: '指定远程文件名称的后缀\n'
      + '可以指定 s.date 来加一个时间戳的后缀，使用 moment 的格式，默认是 "-YYYY-MM-DD"\n'
      + '也可以指定 s.version 来加一个版本号的后缀，使用当前 package.json 中的 version，默认是 "-V"\n'
      + '另外还有 s.before, s.after，最后的结果是 {before}{version}{date}{after}',
    type: 'string',
    requiresArg: true
  },
  hash: {
    desc: '指定远程文件名的 hash 的长度 (0-32)',
    type: 'string',
    requiresArg: true
  },
  hashPrefix: {
    desc: '专门给 hash 的前缀，只有在 hash 不为 0 的情况下才会使用',
    type: 'string',
    'default': '-'
  },
  hashSource: {
    desc: '根据本地还是远程文件来计算 hash',
    choices: ['local', 'remote'],
    type: 'string',
    'default': 'remote'
  },
  rename: {
    desc: '重命名远程文件名称',
    type: 'string',
    'default': '{prefix}{name}{hash}{suffix}',
    requiresArg: true
  },

  '  上传': { desc: ' ' },

  uploader: {
    alias: ['u'],
    desc: '指定要使用的上传器，同时会在 .darc 文件中定位到相关的配置',
    requiresArg: true,
    type: 'string',
    'default': 'qiniu'
  },
  uploaderOpts: {
    alias: 'uo',
    desc: '指定上传器选项（请提供 json 格式的字符串），另外可以通过 --uo.key 的形式来指定具体某个字段的值',
    requiresArg: true,
    type: 'string'
  },
  concurrence: {
    alias: 'limit',
    desc: '指定可以同时上传的文件的个数',
    type: 'string',
    requiresArg: true,
    'default': os.cpus().length * 2
  },


  '  过滤': { desc: ' ' },

  includePatterns: {
    alias: 'inc',
    type: 'array',
    desc: '指定要操作的所有文件的白名单；支持 glob，使用 * 或 . 号时请记得加上引号，下面的类似'
  },
  noIncludePatterns: {
    alias: 'ninc',
    type: 'array',
    desc: '指定要操作的所有文件的黑名单；如果不带任何参数，表示禁止对所有文件操作，下面的类似'
  },
  inspectPatterns: {
    alias: 'ins',
    type: 'array',
    desc: '指定要执行 inspect 操作的文件的白名单'
  },
  noInspectPatterns: {
    alias: 'nins',
    type: 'array',
    desc: '指定要执行 inspect 操作的文件的黑名单'
  },
  uploadPatterns: {
    alias: 'upl',
    type: 'array',
    desc: '指定要执行 upload 操作的文件的白名单'
  },
  noUploadPatterns: {
    alias: 'nupl',
    type: 'array',
    desc: '指定要执行 upload 操作的文件的黑名单'
  },
  replacePatterns: {
    alias: 'rep',
    type: 'array',
    desc: '指定要执行 replace 操作的文件的白名单'
  },
  noReplacePatterns: {
    alias: 'nrep',
    type: 'array',
    desc: '指定要执行 replace 操作的文件的黑名单'
  },
  absolutePatterns: {
    alias: 'abs',
    type: 'array',
    desc: '指定要执行 `替换文件路径为绝对路径` 操作的文件的白名单'
  },
  noAbsolutePatterns: {
    alias: 'nabs',
    type: 'array',
    desc: '指定要执行 `替换文件路径为绝对路径` 操作的文件的黑名单'
  },
  renamePatterns: {
    alias: 'ren',
    type: 'array',
    desc: '指定要执行 `重命名文件名称` 操作的文件的白名单'
  },
  noRenamePatterns: {
    alias: 'nren',
    type: 'array',
    desc: '指定要执行 `重命名文件名称` 操作的文件的黑名单'
  },


  '  运行': { desc: ' ' },
  overwrite: {
    desc: '如果远程文件存在，是否覆盖远程文件',
    type: 'boolean'
  },
  diff: {
    desc: '如果远程文件存在，是否和远程文件对比下，如果一样，则无需重新上传',
    type: 'boolean'
  },
  flat: {
    desc: '是否将文件路径扁平化',
    type: 'boolean'
  },
  min: {
    alias: 'm',
    desc: '是否要对所有上传的文件进行压缩',
    type: 'boolean'
  },
  dry: {
    desc: '只输出运行结果，并不上传文件',
    type: 'boolean'
  },

  runToStep: {
    alias: ['step'],
    desc: '要运行到的步骤',
    choices: ['init', 'inspect', 'minify', 'replace', 'upload'],
    type: 'string',
    requiresArg: true,
    'default': 'upload'
  },
  dependsCheck: {
    align: 'dc',
    desc: '强制进行文件依赖关系的解析，找出循环依赖的地方',
    type: 'boolean'
  },
  // ignoreAll: {
  //   desc: '忽略所有可以忽略的错误',
  //   type: 'boolean'
  // },
  ignoreNoneAssetError: {
    desc: '强制忽略不存在的资源文件，如果不强制忽略，会中断',
    type: 'boolean'
  },
  ignoreDependsError: {
    desc: '强制忽略静态循环依赖的情况，如果不强制忽略，会中断',
    type: 'boolean'
  },
  ignoreUploadError: {
    desc: '强制忽略上传失败的文件，继续上传下面的文件',
    type: 'boolean'
  },
  ignoreExistsError: {
    desc: '强制忽略文件已经存在的提醒，不上传此文件，但继续上传下面的文件',
    type: 'boolean'
  },
  ignoreConflictError: {
    desc: '强制忽略本地文件和远程的冲突的提醒，不上传此文件，但继续上传下面的文件',
    type: 'boolean'
  },

  '  输出': { desc: ' ' },

  outDir: {
    alias: 'o',
    desc: '指定输出文件夹（用于输出上传后的文件）',
    requiresArg: true,
    type: 'string'
  },
  outError: {
    desc: '输出上传失败的文件到指定的 outDir （必须先指定 outDir）',
    'default': true,
    type: 'boolean'
  },
  outSuccess: {
    desc: '输出上传成功的文件到指定的 outDir （必须先指定 outDir）',
    type: 'boolean'
  },
  result: {
    desc: '是否要在终端上输出上传的结果',
    type: 'boolean',
    'default': true
  },
  map: {
    desc: '生成本地到远程文件的映射关系，后面可以接一个文件，用于保存映射关系'
          + '\n如果没有指定文件，则默认会使用 da-map.json'
          + '\n另外可以指定 map.local 或 map.remote 表示只保存本地文件的路径或远程文件的路径',
  },



  '  日志': { desc: ' ' },
  stack: {
    desc: '输出 Error 的 stack 信息',
    type: 'boolean'
  },
  detail: {
    alias: 'd',
    desc: '输出执行日志',
    type: 'count'
  },
  logLevel: {
    alias: 'l',
    choices: ['silent', 'fatal', 'error', 'warn', 'ok', 'info', 'debug', 'verbose', 'silly'],
    desc: '指定输出的日志级别',
    type: 'string',
    requiresArg: true,
    'default': 'ok'
  },
  verbose: {
    desc: '将日志级别设置成 `verbose`，也可以直接用 `-ddd`',
    type: 'boolean'
  },
  silent: {
    desc: '将日志级别设置成 `silent`',
    type: 'boolean'
  },

  '  其它': { desc: ' ' },
  configFile: {
    alias: 'c',
    desc: '指定配置文件的路径',
    config: true,
    requiresArg: true,
    type: 'string'
  },
  minImage: {
    alias: 'mi',
    desc: '压缩图片的配置，请使用 mi.xx 的形式配置，配置项和 min-asset 一致，下同'
    + '\n  optimizationLevel: 0-7, 默认是 3'
    + '\n'
  },
  minHtml: {
    alias: 'mh',
    desc: '压缩 HTML 的配置，请使用 mh.xx 的形式配置'
    + '\n  noCollapseWhitespace'
    + '\n  noCollapseBooleanAttributes'
    + '\n  noRemoveRedundantAttributes'
    + '\n  noUseShortDoctype'
    + '\n  noRemoveScriptTypeAttributes'
    + '\n  noMinifyJS'
    + '\n  noMinifyCSS'
    + '\n'
  },
  minCss: {
    alias: 'mc',
    desc: '压缩 CSS 的配置，可配置项有，表使用 mc.xx 的形式配置'
    + '\n  compatibility: ie7/ie8/*'
    + '\n  keepSpecialComments: 0/1/*'
    + '\n'
  },
  minJs: {
    alias: 'mj',
    desc: '压缩 JS 的配置，可配置项有，请使用 mj.xx 的形式配置'
    + '\n  noMangle'
    + '\n  noDeadCode'
    + '\n  dropConsole'
    + '\n'
  },
  htmlExtensions: {
    desc: '指定 html 的后缀名',
    requiresArg: true,
    type: 'array'
  },
  jsonExtensions: {
    desc: '指定 json 的后缀名',
    requiresArg: true,
    type: 'array'
  },
  cssExtensions: {
    desc: '指定 css 的后缀名',
    requiresArg: true,
    type: 'array'
  },
  jsExtensions: {
    desc: '指定 js 的后缀名',
    requiresArg: true,
    type: 'array'
  }
};
