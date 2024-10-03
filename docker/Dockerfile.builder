FROM node:current-alpine
ARG TARGET_APP

RUN test -n "$TARGET_APP"
RUN apk add --no-cache python3 g++ make
WORKDIR /usr/src/app/$TARGET_APP
COPY ["./$TARGET_APP/package.json",  "./$TARGET_APP/.eslintrc.js", "./$TARGET_APP/tsconfig.json", "/usr/src/app/$TARGET_APP/"]
COPY ["./Base/package.json",  "./Base/.eslintrc.js", "./Base/tsconfig.json", "/usr/src/app/Base/"]
COPY ["./Common/package.json",  "./Common/.eslintrc.js", "./Common/tsconfig.json", "/usr/src/app/Common/"]
RUN ls -la .. && yarn install --frozen-lockfile && \
    cd ../Base && yarn install --frozen-lockfile && \
    cd ../Common && yarn install --frozen-lockfile 