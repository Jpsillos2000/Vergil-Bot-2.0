#!/bin/bash

echo "Running entrypoint.sh..."

# Run deleteCommands (optional, uncomment if you need to clear commands on every deploy)
# node --env-file=.env deleteCommands.js

echo "Deploying Discord commands..."
# Ensure the .env file is used for deployment
node --env-file=.env deployCommands.js

echo "Starting Vergil-Bot-2.0..."
# Start the main bot process
node --env-file=.env index.js
