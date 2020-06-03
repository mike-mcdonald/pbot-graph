FROM node:13

WORKDIR /home/node

ADD . .

RUN npm install

RUN npm run build

FROM node:13-slim

ENV NODE_ENV=production

RUN set -ex \
    && buildDeps='' \
    && runDeps='\
    libgit2-24 \
    ' \
    && apt-get update -yqq \
    && apt-get upgrade -yqq \
    && apt-get install -yqq --no-install-recommends \
    $buildDeps \
    $runDeps \
    && apt-get purge --auto-remove -yqq $buildDeps \
    && apt-get autoremove -yqq --purge \
    && apt-get clean \
    && rm -rf \
    /var/lib/apt/lists/* \
    /tmp/* \
    /var/tmp/* \
    /usr/share/man \
    /usr/share/doc \
    /usr/share/doc-base

WORKDIR /home/node

COPY --from=0 /home/node/node_modules node_modules/
COPY --from=0 /home/node/dist dist/

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]