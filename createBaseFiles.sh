#!/bin/sh

ln -sv ../Base/.hintrc .
ln -sv ../Base/.eslintrc.js .
ln -sv ../Base/obfuscator.config.json .
ln -sv ../Base/tsconfig.json .
ln -sv ../Base/rollup.config.mjs .
cp -R -u -p ../Base/package.json .
cp -R -u -p ../Base/docker ..
cp -R -u -p ../Base/.gitignore ..

if [ ! -f "../buildDockerImages.sh" ]; then
  cd ../
  ln -s ../docker/buildDockerImages.sh .
fi

