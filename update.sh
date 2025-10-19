#!/bin/bash
set -e

# R.S Freight Manager - Application Update Script
# This script pulls the latest changes and updates the application

echo "=========================================="
echo "R.S Freight Manager - Application Update"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/rsfm"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}ERROR: Application directory not found: $APP_DIR${NC}"
    echo "Please run setup.sh first"
    exit 1
fi

# Check if running as correct user
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}ERROR: Please do not run this script as root${NC}"
   echo "Run as the same user that installed the application"
   exit 1
fi

cd $APP_DIR

echo -e "${GREEN}Step 1: Backing up current .env file...${NC}"
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "Backup created: .env.backup"
else
    echo -e "${YELLOW}Warning: No .env file found${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Stashing local changes (if any)...${NC}"
git stash

echo ""
echo -e "${GREEN}Step 3: Pulling latest changes from Git...${NC}"
git pull origin main

echo ""
echo -e "${GREEN}Step 4: Restoring local changes (if any)...${NC}"
git stash pop 2>/dev/null || echo "No stashed changes to restore"

echo ""
echo -e "${GREEN}Step 5: Installing/updating npm dependencies...${NC}"
npm install

echo ""
echo -e "${GREEN}Step 6: Building application for production...${NC}"
npm run build

echo ""
echo -e "${GREEN}Step 7: Running database migrations...${NC}"
echo "Running data migration script (text[] to jsonb)..."
# Migration already completed - commenting out to avoid SSL certificate issues
# npx tsx scripts/migrate-attachments-to-jsonb.ts || echo -e "${YELLOW}Migration script returned non-zero exit code, continuing...${NC}"
echo "Pushing database schema changes..."
npm run db:push -- --force

echo ""
echo -e "${GREEN}Step 8: Updating PM2 ecosystem config...${NC}"
cat > $APP_DIR/ecosystem.config.cjs << 'EOFECO'
const fs = require('fs');
const path = require('path');

// Read .env file and parse it
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = { NODE_ENV: 'production' };

envFile.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    value = value.replace(/^["']|["']$/g, '');
    envVars[key.trim()] = value;
  }
});

module.exports = {
  apps: [{
    name: 'rsfm',
    script: './dist/index.js',
    cwd: '/var/www/rsfm',
    env: envVars,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOFECO

echo ""
echo -e "${GREEN}Step 9: Restarting PM2 process with ecosystem config...${NC}"
pm2 delete rsfm 2>/dev/null || true
pm2 start $APP_DIR/ecosystem.config.cjs

echo ""
echo -e "${GREEN}Step 10: Saving PM2 configuration...${NC}"
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "Update Complete!"
echo "==========================================${NC}"
echo ""
echo "Application Status:"
pm2 status rsfm
echo ""
echo "To view logs, run:"
echo -e "   ${YELLOW}pm2 logs rsfm${NC}"
echo ""
echo "To view real-time logs, run:"
echo -e "   ${YELLOW}pm2 logs rsfm --lines 100${NC}"
echo ""
echo -e "${YELLOW}Note: If you had uncommitted changes, they were stashed.${NC}"
echo -e "Restore them with: ${YELLOW}git stash pop${NC}"
echo ""
