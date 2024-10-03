#!/bin/sh 

if [ -z "$1" ];then
    echo "No target specified"
    exit 1
fi 

ALLOWED_TARGETS="API Controller Scrapper UI"
if [[ ! " $ALLOWED_TARGETS " =~ .*\ $1\ .* ]]; then
    echo "target must be one of ($ALLOWED_TARGETS)"
    exit 1
fi
TARGET=$1

if [ -z "$2" ];then
    Registry="docker-hub.targoman.com/projects"
else 
    Registry = $2
fi 

echo "=== initializing $TARGET"
source ./docker/init.sh $TARGET
echo "Target image will be: $ImageName"
echo "Computed fingerprint: $fingerprint"
fingerprintPath=./docker/.fingerprint-$TARGET

rebuild=0
if [ -f $fingerprintPath ]; then    
    if [ "$(cat $fingerprintPath)" != "$fingerprint" ]; then
        echo "=== fingerprint changed so rebuilding all: $(cat $fingerprintPath) vs $fingerprint"
        rebuild=1
    fi
    echo "=== Using old build images"
else
    echo "=== no fingerprint found so rebuilding all"
    rebuild=1
fi

LastVersion=`sudo docker images | grep "$ImageName" | cut -d ' ' -f 4 | sort | tail -n 1`
Date=$(date +"%Y%m%d%H%M%S")

if [ -z "$LastVersion" ];then 
    NewVersion="latest_$Date"
else
    NewVersion=$(echo $LastVersion | sed "s/\_.*//g")"_$Date"
fi

LastVersion=`sudo docker images | grep "$ImageName" | cut -d ' ' -f 4 | sort | tail -n 1`

echo "=== cheking if old builder image is found"
sudo docker pull ${ImageName}:builder
# if [ $? -ne 0 ]||[ $rebuild -eq 1 ];then
# fi

if [ $rebuild -eq 1 ];then
    sudo docker build -t ${ImageName}:builder --build-arg TARGET_APP=${TARGET} -f ./docker/Dockerfile.builder . 
    if [ $? -ne 0 ];then exit 1; fi 
    echo $fingerprint > $fingerprintPath
fi

sudo docker build -f ./docker/Dockerfile.app --build-arg TARGET_APP=${TARGET} --build-arg BUILDER_IMAGE=${ImageName}:builder -t ${ImageName}:$NewVersion . && \
sudo docker rmi "$ImageName:latest" || true && \
sudo docker tag "$ImageName:$NewVersion" "$ImageName:latest" && \
sudo docker push "$ImageName:$NewVersion"  && \
sudo docker push "$ImageName:latest"  && \
sudo docker push ${ImageName}:builder

rm -rf $BUILD_PATH

