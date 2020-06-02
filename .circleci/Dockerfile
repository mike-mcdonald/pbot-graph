FROM node:13-slim

ENV NODE_ENV=production

WORKDIR /home/node

ADD package*.json ./

ADD ./node_modules node_modules/

ADD ./dist dist/

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]