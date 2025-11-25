FROM node:22-bookworm-slim

WORKDIR /usr/src/app


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

# Install Node.js dependencies using npm ci for cleaner builds
RUN npm ci

# Copy the rest of the application code
COPY . .

# Use the npm docker-start script to deploy commands and then start the bot
CMD ["npm", "run", "docker-start"]