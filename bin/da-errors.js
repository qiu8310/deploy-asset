
module.exports = {

  // step-init

  STEP_NOT_FOUND: '没有找到配置中指定的 runToStep',

  NO_SPECIFY_BASE_URL: '配置中没有指定 baseUrl',

  OVERWRITE_AND_DIFF_CONFLICT: '不能同时将 overwrite 和 diff 都设置成 true',

  ANY_ARGUMENT_ERROR: 'da 函数的第一个参数只支持 String 和 Array<String>',

  NO_COMMON_DIRECTORY: '文件不能分布在不同的磁盘上', // 只有在 window 的下才会出现

  NO_FILES: '根据你当前的配置，没有找到任何文件',

  FILE_NOT_IN_ROOT_DIR: '文件不在指定的根目录内',

  NO_FILE_AFTER_FILTER: '根据你当前的配置，能找到文件，但是过滤后就没有任何文件了',

  UPLOADER_NOT_FOUND: '没有指定 Uploader 或者指定的 Uploader 不存在',

  UPLOADER_CONFIG_ERROR: 'Uploader 的配置出问题了',


  // step-inspect

  NONE_ASSET: 'inspect 找到的依赖资源不存在',

  NO_OUT_DIR_FOR_FILE: '没有为不上传的文件指定 outDir',

  DEPEND_ASSET_NOT_UPLOAD: '要上传的文件依赖了没有上传的文件',


  // step-replace

  DEPENDS_ERROR: '静态资源中出现了循环依赖',


  // step-upload

  REMOTE_FILE_EXISTS: '远程文件已经存在',

  REMOTE_FILE_CONFLICT: '和远程文件内容冲突',

  UPLOAD_ERROR: '上传过程中出现错误'

};
