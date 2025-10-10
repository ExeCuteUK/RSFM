#!/bin/bash
set -e

# R.S Freight Manager - Ubuntu Server Setup Script
# This script installs all dependencies and sets up the application on a fresh Ubuntu server

echo "=========================================="
echo "R.S Freight Manager - Server Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}ERROR: Please do not run this script as root${NC}"
   echo "Run as a regular user with sudo privileges"
   exit 1
fi

# Configuration
APP_DIR="/var/www/rsfm"
APP_USER=$(whoami)
GIT_REPO="https://github.com/ExeCuteUK/RSFM.git"
NODE_VERSION="20"

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

echo ""
echo -e "${GREEN}Step 2: Installing Node.js ${NODE_VERSION}.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

echo ""
echo -e "${GREEN}Step 3: Installing PostgreSQL 16...${NC}"
if ! command -v psql &> /dev/null; then
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt-get update
    sudo apt-get install -y postgresql-16
else
    echo "PostgreSQL already installed: $(psql --version)"
fi

echo ""
echo -e "${GREEN}Step 4: Installing PM2 process manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "PM2 already installed: $(pm2 --version)"
fi

echo ""
echo -e "${GREEN}Step 5: Installing Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
else
    echo "Git already installed: $(git --version)"
fi

echo ""
echo -e "${GREEN}Step 6: Creating application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown $APP_USER:$APP_USER $APP_DIR

echo ""
echo -e "${GREEN}Step 7: Cloning repository...${NC}"
echo -e "${YELLOW}You will be prompted for GitHub credentials (use Personal Access Token as password)${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository already cloned, skipping..."
else
    git clone $GIT_REPO $APP_DIR
fi

echo ""
echo -e "${GREEN}Step 8: Installing npm dependencies...${NC}"
cd $APP_DIR
npm install

echo ""
echo -e "${GREEN}Step 9: Creating .env file...${NC}"
if [ -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: .env file already exists, skipping...${NC}"
else
    cat > $APP_DIR/.env << 'EOF'
# R.S Freight Manager - Environment Configuration

# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration (PostgreSQL)
# Format: postgresql://username:password@localhost:5432/database_name
DATABASE_URL=postgresql://rsfm_user:CHANGE_ME@localhost:5432/rsfm_db

# Session Secret (auto-generated below)
SESSION_SECRET=

# Google Drive Service Account (for file storage and backups)
# Create service account at: https://console.cloud.google.com/iam-admin/serviceaccounts
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# Gmail OAuth Credentials (for email sending)
# Create OAuth credentials at: https://console.cloud.google.com/apis/credentials
GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token

# Terminal49 API (for container tracking - optional)
TERMINAL49_API_KEY=your-terminal49-api-key
EOF
    
    # Generate SESSION_SECRET
    SESSION_SECRET=$(openssl rand -base64 32)
    sed -i "s/SESSION_SECRET=/SESSION_SECRET=$SESSION_SECRET/" $APP_DIR/.env
    
    echo -e "${GREEN}Created .env file with generated SESSION_SECRET${NC}"
    echo -e "${YELLOW}IMPORTANT: Edit $APP_DIR/.env and configure all required secrets${NC}"
fi

echo ""
echo -e "${GREEN}Step 10: Setting up PostgreSQL database...${NC}"
DB_NAME="rsfm_db"
DB_USER="rsfm_user"

# Check if database user already exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_catalog.pg_user WHERE usename = '$DB_USER'")

if [ "$USER_EXISTS" = "1" ]; then
    echo -e "${YELLOW}Database user '$DB_USER' already exists, skipping creation...${NC}"
    echo -e "${YELLOW}Using existing DATABASE_URL from .env${NC}"
else
    DB_PASS=$(openssl rand -base64 16)
    
    # Create database user and database
    sudo -u postgres psql << EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    # Update DATABASE_URL in .env
    sed -i "s|DATABASE_URL=postgresql://rsfm_user:CHANGE_ME@localhost:5432/rsfm_db|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|" $APP_DIR/.env
    
    echo -e "${GREEN}Database created: $DB_NAME${NC}"
    echo -e "${GREEN}Database user created: $DB_USER${NC}"
    echo -e "${GREEN}DATABASE_URL updated in .env${NC}"
fi

echo ""
echo -e "${GREEN}Step 11: Building application for production...${NC}"
cd $APP_DIR
npm run build

echo ""
echo -e "${GREEN}Step 12: Pushing database schema...${NC}"
npm run db:push

echo ""
echo -e "${GREEN}Step 13: Setting up PM2 process...${NC}"
pm2 delete rsfm 2>/dev/null || true
pm2 start npm --name rsfm -- start
pm2 save

echo ""
echo -e "${GREEN}Step 14: Enabling PM2 startup script...${NC}"
sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u $APP_USER --hp /home/$APP_USER
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure environment secrets:"
echo -e "   ${YELLOW}sudo nano $APP_DIR/.env${NC}"
echo ""
echo "2. Configure Google Drive Service Account:"
echo "   - Create service account at: https://console.cloud.google.com/iam-admin/serviceaccounts"
echo "   - Download JSON key file and extract email + private_key"
echo "   - Share your Google Drive folder with the service account email"
echo ""
echo "3. Configure Gmail OAuth:"
echo "   - Create OAuth credentials at: https://console.cloud.google.com/apis/credentials"
echo "   - Use the OAuth playground to get a refresh token"
echo "   - See DEPLOYMENT.md for detailed instructions"
echo ""
echo "4. (Optional) Configure Terminal49 API for container tracking"
echo ""
echo "5. Restart the application after configuring secrets:"
echo -e "   ${YELLOW}pm2 restart rsfm${NC}"
echo ""
echo "6. Check application status:"
echo -e "   ${YELLOW}pm2 status${NC}"
echo -e "   ${YELLOW}pm2 logs rsfm${NC}"
echo ""
echo "7. Access the application at: http://YOUR_SERVER_IP:5000"
echo ""
echo -e "${YELLOW}For detailed deployment documentation, see: $APP_DIR/DEPLOYMENT.md${NC}"
echo ""
