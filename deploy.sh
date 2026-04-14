#!/bin/bash

# 🛡️ Shield Suite — VPS Deployment Script
# This script automates the setup of Shield Suite on a Linux VPS.

echo "🛡️ Starting Shield Suite Deployment..."

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Check for PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 3. Install Dependencies
echo "📂 Installing project dependencies..."
npm install

# 4. Check Environment File
if [ ! -f .env ]; then
    echo "⚠️ .env file not found!"
    if [ -f .env.example ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        echo "‼️ ACTION REQUIRED: Please edit .env with your OKX API credentials."
    fi
fi

# 5. Build Packages
echo "🏗️ Building packages..."
npm run build

# 6. Start Services with PM2
echo "🚀 Launching Shield Suite Services..."

# Kill existing processes if any
pm2 delete scanguard-api shield-agent 2>/dev/null

# Start Backend API
pm2 start "npm run dev:scanguard" --name scanguard-api

# Start Autonomous Agent
pm2 start "npm run agent" --name shield-agent

# Save PM2 state
pm2 save

echo ""
echo "✅ Deployment Complete!"
echo "--------------------------------------------------"
echo "ScanGuard API: Running on port 3402"
echo "Shield Agent:  Active (5min scanning cycles)"
echo "--------------------------------------------------"
echo "Use 'pm2 list' to check status or 'pm2 logs' for activity."
