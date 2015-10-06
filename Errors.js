/*

step-init

 STEP_NOT_FOUND: opts 中指定的 runToStep 名称没有找到
 NO_SPECIFY_BASE_URL: 没有指定 baseUrl
 OVERWRITE_AND_DIFF_CONFLICT: opts 中 overwrite 和 diff 同时为 true

 ANY_ARGUMENT_ERROR: da 的 any 参数格式不支持，默认只支持 String 和 Array<String>

 NO_COMMON_DIRECTORY: da 的 any 中指定的文件没有相同的目录，只有在 window 的下才会出现（文件在不同的磁盘上）

 NO_FILES: 根据 da 的 any 参数，没有找到一个文件

 FILE_NOT_IN_ROOT_DIR: 文件不在根目录内

 NO_FILE_AFTER_FILTER: 所有找到的文件在执行完 includePatterns 和 noIncludePatterns 后就没有文件了

 UPLOADER_NOT_FOUND: opts 中指定的 uploader 没有找到
 UPLOADER_CONFIG_ERROR


 系统错误：

 指定的 rootDir 不存在，那么程序在运行 process.chdir(rootDir) 时会报错



step-inspect

 NONE_ASSET  inspect 找到的 asset 资源不存在

NO_OUT_DIR_FOR_FILE  没有为不上传的文件指定 outDir
DEPEND_ASSET_NOT_UPLOAD  要上传的文件依赖了没有上传的文件


step-replace

 DEPENDS_ERROR 循环依赖


step-upload

 REMOTE_FILE_EXISTS
 REMOTE_FILE_CONFLICT
 UPLOAD_ERROR
 */
