FROM node:current-alpine
ARG TARGET_APP

RUN test -n "$TARGET_APP"
RUN apk add --no-cache python3 g++ make
WORKDIR /usr/src/app/$TARGET_APP
COPY ["./$TARGET_APP/package.json",  "./$TARGET_APP/eslint.config.mjs", "./$TARGET_APP/tsconfig.json", "/usr/src/app/$TARGET_APP/"]
COPY ["./submodules/BaseNode/package.json",  "./submodules/BaseNode/eslint.config.mjs", "./submodules/BaseNode/tsconfig.json", "/usr/src/app/submodules/BaseNode/"]
COPY ["./Common/package.json",  "./Common/eslint.config.mjs", "./Common/tsconfig.json", "/usr/src/app/Common/"]
RUN ls -la .. && yarn install --frozen-lockfile && \
    cd ../submodules/BaseNode && yarn install --frozen-lockfile && \
    cd ../../Common && yarn install --frozen-lockfile 