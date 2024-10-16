#!/bin/sh

ln -sv ../submodules/BaseNode/.hintrc .
ln -sv ../submodules/BaseNode/eslint.config.mjs .
ln -sv ../submodules/BaseNode/obfuscator.config.json .
ln -sv ../submodules/BaseNode/tsconfig.json .
ln -sv ../submodules/BaseNode/rollup.config.mjs .
cp -R -u -p ../submodules/BaseNode/package.json .
cp -R -u -p ../submodules/BaseNode/docker ..
cp -R -u -p ../submodules/BaseNode/.gitignore ..

if [ ! -f "../buildDockerImages.sh" ]; then
  cd ../
  ln -s ../docker/buildDockerImages.sh .
fi

