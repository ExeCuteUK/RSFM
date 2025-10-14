#!/bin/bash

# R.S Freight Manager - Replit Update Script
# Simple update script for Replit development environment

echo "=========================================="
echo "R.S Freight Manager - Replit Update"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Step 1: Fetching latest changes...${NC}"
git fetch origin main

echo ""
echo -e "${GREEN}Step 2: Pulling latest code...${NC}"
git pull origin main

echo ""
echo -e "${GREEN}Step 3: Installing/updating npm dependencies...${NC}"
npm install

echo ""
echo -e "${YELLOW}Update complete!${NC}"
echo "The Replit workflow will automatically restart the application."
echo ""
