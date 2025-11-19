# Usamos a versão 20 ou 22 (LTS) baseada em Debian (Bookworm)

FROM node:22-bookworm-slim


WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*


COPY package*.json ./


RUN npm install


COPY . .


CMD ["node", "index.js"]