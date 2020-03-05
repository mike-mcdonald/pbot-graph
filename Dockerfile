FROM node:13

WORKDIR /home/node

ADD . .

RUN npm install

RUN npm run build

RUN chown -R node:node dist/

USER node

CMD ["node", "dist/index.js"]