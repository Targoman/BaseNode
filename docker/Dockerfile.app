ARG BUILDER_IMAGE

##############################################333
FROM $BUILDER_IMAGE as builder
ARG TARGET_APP
WORKDIR /usr/src/app/$TARGET_APP
COPY ./$TARGET_APP/src /usr/src/app/$TARGET_APP/src
COPY ./$TARGET_APP/.eslintrc.js ./$TARGET_APP/public* /usr/src/app/$TARGET_APP/public/
COPY ./Common/src /usr/src/app/Common/src
COPY ./Base/src /usr/src/app/Base/src
RUN ls -la && find public && yarn container 

##############################################333
FROM node:current-alpine
ARG TARGET_APP
ENV TARGET_APP=$TARGET_APP
WORKDIR /usr/src/app
COPY --from=builder "/usr/src/app/$TARGET_APP/node_modules/" "/usr/src/app/node_modules/"
COPY --from=builder "/usr/src/app/$TARGET_APP/package.json" "/usr/src/app/package.json"
COPY --from=builder "/usr/src/app/$TARGET_APP/.build/" "/usr/src/app/.build/"
COPY "./$TARGET_APP/config4container.json" "/usr/src/app/.config.json"
RUN chown node:node /usr/src/app/.config.json && chown node:node ./  
USER node
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ENV TZ="Asia/Tehran"
ENV FORCE_COLOR=1

ENTRYPOINT node .build/$TARGET_APP/src/index.js $*

