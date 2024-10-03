TARGET=$1
ImageName="$Registry/persian-im/$(echo $TARGET | tr '[:upper:]' '[:lower:]')"

fingerprint=$(cat ./$TARGET/package.json ./$TARGET/yarn.lock ./$TARGET/.eslintrc.js ./$TARGET/tsconfig.json | md5sum | cut -d ' ' -f 1) 

pushd $TARGET
yarn container
if [ $? -ne 0 ];then exit 1; fi 
popd
