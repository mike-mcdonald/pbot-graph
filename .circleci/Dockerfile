FROM node:13

WORKDIR /home/node

ADD . .

RUN npm install

FROM node:13-slim

ENV NODE_ENV=production

WORKDIR /home/node

ADD package*.json ./

COPY --from=0 /home/node/node_modules node_modules/

ADD ./dist dist/

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]