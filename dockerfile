FROM node:22-bookworm-slim

WORKDIR /usr/src/app


RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-venv \
    python3-dev \
    make \
    g++ \
    build-essential \
    libtool \
    autoconf \
    automake \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv .venv_python
COPY requirements.txt ./

RUN /usr/src/app/.venv_python/bin/pip install --no-cache-dir -v -r requirements.txt
COPY package.json ./
COPY package-lock.json ./

# Install Node.js dependencies using npm ci for cleaner builds
RUN npm ci

# Copy the rest of the application code
COPY . .

# Start the bot
CMD ["node", "--env-file=.env", "index.js"]