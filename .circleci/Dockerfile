FROM node:13-slim

ENV NODE_ENV=production

WORKDIR /home/node

ADD package*.json ./

RUN npm install

ADD ./dist dist/

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]