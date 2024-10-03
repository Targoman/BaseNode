#!/bin/sh 

# ImageName="docker-registry.tip.co.ir/IMScrap/$scrapper"
# Container="scrapper"
# ContainerParams=""

LastVersion=`sudo docker images | grep "$ImageName" | cut -d ' ' -f 4 | sort | tail -n 1`
Date=$(date +"%Y%m%d%H%M%S")

NewVersion=$(echo $LastVersion | sed "s/\_.*//g")"_$Date"
sudo docker rm -f $Container; \
sudo docker build -t "$ImageName:$NewVersion" .  --cache-from $Image:latest && \
sudo docker rmi "$ImageName:latest"; \
sudo docker tag "$ImageName:$NewVersion" "$ImageName:latest" && \
sudo docker push "$ImageName:$NewVersion"  && \
sudo docker push "$ImageName:latest"  


