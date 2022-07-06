# build phase
FROM node:alpine as build

# install required dependencies for building
RUN apk update
RUN apk add --no-cache git python3 alpine-sdk

RUN mkdir -p /app

WORKDIR /app

COPY package.json .

RUN npm config set python "/usr/bin/python3"
RUN npm install --loglevel verbose

# deploy phase
FROM node:alpine

COPY --from=mwader/static-ffmpeg:5.0.1-3 /ffmpeg /usr/local/bin/
COPY --from=mwader/static-ffmpeg:5.0.1-3 /ffprobe /usr/local/bin/

WORKDIR /app

COPY --from=build /app /app

COPY . .

USER node

CMD ["npm", "start"]