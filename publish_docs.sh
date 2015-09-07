#!/usr/bin/env sh

dir=`dirname $0`

# 生成文档
cd $dir
npm run docs


echo "Document direcotry: `pwd`"

if [[ ! -d ./.git ]]; then
  git init
  git remote add origin git@github.com:qiu8310/deploy-asset.git
  git co -b gh-pages
else
  git co gh-pages -q
fi

cp -r docs/* .

git add . -A
git commit -m "publish docs"
git push origin gh-pages 
git co master
