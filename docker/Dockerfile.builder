FROM node:current-alpine
ARG TARGET_APP

RUN test -n "$TARGET_APP"
RUN apk add --no-cache python3 g++ make
WORKDIR /usr/src/app/$TARGET_APP
COPY ["./$TARGET_APP/package.json",  "./$TARGET_APP/eslint.config.mjs", "./$TARGET_APP/tsconfig.json", "/usr/src/app/$TARGET_APP/"]
COPY ["./BaseNode/package.json",  "./BaseNode/eslint.config.mjs", "./BaseNode/tsconfig.json", "/usr/src/app/BaseNode/"]
COPY ["./Common/package.json",  "./Common/eslint.config.mjs", "./Common/tsconfig.json", "/usr/src/app/Common/"]
RUN ls -la .. && yarn install --frozen-lockfile && \
    cd ../BaseNode && yarn install --frozen-lockfile && \
    cd ../Common && yarn install --frozen-lockfile 