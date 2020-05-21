FROM node:13

WORKDIR /home/node

ADD . .

RUN npm install

RUN npm run build

FROM node:13-slim

ENV NODE_ENV=production

WORKDIR /home/node

COPY --from=0 /home/node/node_modules node_modules/
COPY --from=0 /home/node/dist dist/

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]