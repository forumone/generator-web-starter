ARG node_version=12

FROM node:${node_version}-alpine AS base

RUN apk update && apk upgrade && \
  apk add --no-cache bash git openssh curl docker-cli tar jq

RUN echo -n "Node: " && node -v && echo -n "npm: " && npm -v

# Install and run all Node configuration outside of /root for access.
ENV HOME /usr/local
RUN npm config set prefix /usr/local

RUN npm install --global --silent yo

# Precreate the insights file so Yeoman doesn't fail outright. Even
# with the --no-insight flag execution fails if this file isn't writable.
RUN mkdir -p /usr/local/.config/insight-nodejs && \
  touch /usr/local/.config/insight-nodejs/insight-yo.json && \
  touch /usr/local/.config/configstore/yo.json && \
  find /usr/local/.config -type d -exec chmod 775 {} \; && \
  find /usr/local/.config -type f -exec chmod 664 {} \;

WORKDIR /src

COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD [ "bash" ]

FROM base AS build

COPY ./ ./

RUN set -ex \
  && npm ci \
  && npm pack --unsafe-perm \
  && npm install --global --silent generator-web-starter-$(jq -r .version package.json).tgz

FROM base AS stable

RUN set -ex \
  && npm install --global --silent generator-web-starter

FROM base AS next

ARG VERSION=next

RUN set -ex \
  && npm install --global --silent generator-web-starter@${VERSION}
