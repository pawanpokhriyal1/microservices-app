# use the official node.js version 18 with alpine linux as the base image

FROM node:18-alpine

WORKDIR /use/src/app

COPY package*.json ./

RUN npm ci -only=production

COPY . .

EXPOSE 3003

CMD [ "node","src/server.js" ]