FROM node:14-slim

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

ADD package*.json ./

COPY --from=0 /home/node/node_modules node_modules/

ADD ./dist dist/

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]