FROM node:22-bookworm-slim

WORKDIR /usr/src/app

# ADICIONEI: libtool, autoconf e automake (necessários para compilar o sodium)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    build-essential \
    libtool \
    autoconf \
    automake \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "index.js"]