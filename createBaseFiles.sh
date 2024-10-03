#!/bin/sh

ln -sv ../BaseNode/.hintrc .
ln -sv ../BaseNode/.eslintrc.js .
ln -sv ../BaseNode/obfuscator.config.json .
ln -sv ../BaseNode/tsconfig.json .
ln -sv ../BaseNode/rollup.config.mjs .
cp -R -u -p ../BaseNode/package.json .
cp -R -u -p ../BaseNode/docker ..
cp -R -u -p ../BaseNode/.gitignore ..

if [ ! -f "../buildDockerImages.sh" ]; then
  cd ../
  ln -s ../docker/buildDockerImages.sh .
fi

