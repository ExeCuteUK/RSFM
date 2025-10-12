# Ubuntu Server Deployment Guide

This guide provides step-by-step instructions for deploying R.S Freight Manager on a Ubuntu server (22.04 LTS or higher).

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Google Drive Service Account Setup](#google-drive-service-account-setup)
4. [Gmail OAuth Setup](#gmail-oauth-setup)
5. [Server Deployment](#server-deployment)
6. [Application Updates](#application-updates)
7. [Troubleshooting](#troubleshooting)
8. [Production Checklist](#production-checklist)

## Overview

The deployment uses:
- **Node.js 20.x** - Runtime environment
- **PostgreSQL 16** - Database
- **PM2** - Process manager for production
- **GitHub** - Private repository hosting

The application runs on port 5000 by default. No reverse proxy (Nginx/Apache) is required unless you need HTTPS or custom domain routing.

## Prerequisites

- Ubuntu 22.04 LTS or higher server with:
  - At least 2GB RAM
  - 20GB disk space
  - Root or sudo access
- GitHub account with access to the private repository
- GitHub Personal Access Token (for cloning private repo)
- Google Cloud Platform account (for Drive & Gmail APIs)

## Google Drive Service Account Setup

The application uses Google Drive for file storage and database backups. Follow these steps to create a service account:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Note your project ID for later

### 2. Enable Required APIs

1. Go to **APIs & Services > Library**
2. Search for and enable:
   - **Google Drive API**
   - **Gmail API** (for email sending)
   - **Google Calendar API** (for team calendar)

### 3. Create Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click **"Create Service Account"**
3. Enter details:
   - **Name:** `rsfm-service-account`
   - **Description:** "R.S Freight Manager service account for Drive and Gmail"
4. Click **"Create and Continue"**
5. Skip granting roles (click "Continue")
6. Click **"Done"**

### 4. Create and Download Key

1. Find your newly created service account in the list
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key" > "Create new key"**
5. Select **"JSON"** format
6. Click **"Create"** - a JSON file will download

### 5. Extract Credentials

Open the downloaded JSON file and locate:
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "rsfm-service-account@your-project.iam.gserviceaccount.com",
  ...
}
```

You'll need:
- **`client_email`** → Use as `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **`private_key`** → Use as `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

⚠️ **Important:** The private key contains `\n` characters that must be preserved. When setting the environment variable, use the key exactly as shown in the JSON file.

### 6. Share Drive Folder with Service Account

1. Open [Google Drive](https://drive.google.com)
2. Create or locate your "RS Freight Manager" folder
3. Right-click the folder → **"Share"**
4. Add the service account email (e.g., `rsfm-service-account@your-project.iam.gserviceaccount.com`)
5. Set permission to **"Editor"**
6. Uncheck **"Notify people"** (service accounts don't receive emails)
7. Click **"Share"**

## Gmail OAuth Setup

The application sends and receives emails via Gmail API using OAuth2 credentials. This setup requires obtaining a refresh token.

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services > Credentials**
4. Click **"Create Credentials" > "OAuth client ID"**
5. If prompted, configure the OAuth consent screen:
   - **User Type:** External
   - **App name:** R.S Freight Manager
   - **User support email:** Your email
   - **Developer contact:** Your email
   - **Scopes:** Click "Add or Remove Scopes" and add:
     - `https://mail.google.com/` (Full Gmail access - send & receive emails)
     - `https://www.googleapis.com/auth/calendar` (Google Calendar - manage team events)
   - **Test users:** Add the Gmail account that will send/receive emails
6. Return to **"Create OAuth client ID"**:
   - **Application type:** Web application
   - **Name:** RSFM Gmail OAuth
   - **Authorized redirect URIs:** `https://developers.google.com/oauthplayground`
7. Click **"Create"**
8. Note your **Client ID** and **Client Secret**

### 2. Generate Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the **Settings** icon (⚙️) in the top right
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret**
5. Close settings
6. In **Step 1** (Select & authorize APIs):
   - Find **Gmail API v1** and select `https://mail.google.com/` (full Gmail access)
   - Find **Google Calendar API v3** and select `https://www.googleapis.com/auth/calendar`
   - Click **"Authorize APIs"**
7. Sign in with the Gmail account you want to use for sending/receiving emails
8. Click **"Allow"** to grant permissions
9. In **Step 2** (Exchange authorization code for tokens):
   - Click **"Exchange authorization code for tokens"**
10. Copy the **Refresh token** from **Step 2**

You'll need:
- **Client ID** → Use as `GMAIL_CLIENT_ID`
- **Client Secret** → Use as `GMAIL_CLIENT_SECRET`
- **Refresh token** → Use as `GMAIL_REFRESH_TOKEN`

⚠️ **Important:** The refresh token expires after 7 days if your app remains in "Testing" mode. To prevent expiration:
1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **"Publish App"** to move to production
3. Note: This may require app verification if you have more than 100 users

### 3. Configure Server Redirect URI (After Deployment)

After deploying the application and setting `APP_BASE_URL` in your `.env` file, you need to add the server redirect URI to your OAuth credentials:

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your **OAuth 2.0 Client ID** (RSFM Gmail OAuth)
3. Under **Authorized redirect URIs**, add:
   - `${APP_BASE_URL}/api/gmail/callback` (e.g., `http://192.168.1.100:5000/api/gmail/callback` or `https://yourdomain.com/api/gmail/callback`)
4. Click **Save**

💡 **Note:** You can keep the OAuth Playground redirect URI (`https://developers.google.com/oauthplayground`) - it's still needed if you ever regenerate the refresh token.

### 4. Test Gmail Configuration

After deploying the application and configuring the redirect URI, you can test Gmail integration from the Settings page. If configured correctly, you'll see:
- ✅ Gmail connected
- Connected email address displayed

## Server Deployment

### 1. Prepare GitHub Personal Access Token

1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Set scopes:
   - ✅ **repo** (all sub-scopes)
4. Click **"Generate token"**
5. Copy the token (you won't see it again!)

### 2. Clone Repository and Run Setup Script

Since the repository is private, you'll need to clone it first with authentication:

```bash
# Install Git if not already installed
sudo apt-get update
sudo apt-get install -y git

# Clone the repository (you'll be prompted for credentials)
# Use your GitHub username and Personal Access Token as password
git clone https://github.com/ExeCuteUK/RSFM.git /tmp/rsfm-setup

# Navigate to the cloned directory
cd /tmp/rsfm-setup

# Make setup script executable
chmod +x setup.sh

# Run setup (DO NOT run as root)
./setup.sh
```

⚠️ **Note:** When prompted for password, use your GitHub Personal Access Token, not your GitHub password.

The setup script will clone the repository again to `/var/www/rsfm` for the production installation. The temporary clone in `/tmp/rsfm-setup` can be deleted after setup completes.

The script will:
1. Update system packages
2. Install Node.js 20, PostgreSQL 16, PM2, and Git
3. Create application directory at `/var/www/rsfm`
4. Prompt for GitHub credentials (use Personal Access Token as password)
5. Clone the repository
6. Install npm dependencies
7. Generate `.env` file with placeholder secrets
8. Create PostgreSQL database with auto-generated credentials
9. Build the application for production
10. Setup PM2 process manager
11. Enable auto-start on system reboot

### 3. Configure Environment Variables

After setup completes, edit the `.env` file:

```bash
sudo nano /var/www/rsfm/.env
```

Update these values:

```bash
# Application Base URL (REQUIRED for Gmail OAuth)
APP_BASE_URL=http://YOUR_SERVER_IP:5000

# Google Drive Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Gmail OAuth
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token

# Google Calendar (for team holidays/annual leave)
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com

# Terminal49 API (optional)
TERMINAL49_API_KEY=your-terminal49-api-key
```

⚠️ **Important Notes:**
- **`APP_BASE_URL`** is required for Gmail OAuth callbacks. Set to your server's URL (e.g., `http://192.168.1.100:5000` or `https://yourdomain.com`). Do NOT include a trailing slash.
- Add `${APP_BASE_URL}/api/gmail/callback` to **Authorized redirect URIs** in your [Google Cloud Console OAuth credentials](https://console.cloud.google.com/apis/credentials)
- The `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must include the `\n` newline characters
- Wrap the private key in quotes if it contains special characters
- The `DATABASE_URL` and `SESSION_SECRET` are auto-generated - don't change them

### 4. Restart Application

```bash
pm2 restart rsfm
```

### 5. Verify Deployment

Check application status:
```bash
pm2 status
pm2 logs rsfm
```

Access the application:
```
http://YOUR_SERVER_IP:5000
```

### 6. Cleanup (Optional)

After successful deployment, you can remove the temporary setup directory:
```bash
rm -rf /tmp/rsfm-setup
```

## Application Updates

When you need to update the application with latest changes from GitHub:

### 1. Run Update Script

The update script is already included in your application directory:

```bash
# Navigate to app directory
cd /var/www/rsfm

# Make sure update script is executable
chmod +x update.sh

# Run update
./update.sh
```

The update script will:
1. Backup your `.env` file
2. Stash any local changes
3. Pull latest changes from Git
4. Restore local changes (if any)
5. Install/update npm dependencies
6. Build application for production
7. Run database migrations
8. Restart PM2 process

### 2. Manual Update (Alternative)

If you prefer manual updates:

```bash
cd /var/www/rsfm

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build for production
npm run build

# Run migrations
npm run db:push

# Restart
pm2 restart rsfm
```

## Troubleshooting

### Application Won't Start

**Check PM2 logs:**
```bash
pm2 logs rsfm --lines 100
```

**Common issues:**
- Database connection failure → Check `DATABASE_URL` in `.env`
- Missing secrets → Verify all required environment variables are set
- Port already in use → Check if port 5000 is available: `sudo lsof -i :5000`

### Google Drive Authentication Fails

**Error:** `Google Drive not configured`

**Solutions:**
1. Verify `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are set in `.env`
2. Ensure the service account email has "Editor" access to your Drive folder
3. Check private key includes `\n` characters and is properly quoted
4. Restart application: `pm2 restart rsfm`

### Gmail Authentication Fails

**Error:** `Gmail not configured`

**Solutions:**
1. Verify all three Gmail variables are set: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
2. Ensure OAuth credentials are from the same Google Cloud project
3. Check if refresh token expired (happens if app is in "Testing" mode)
4. Regenerate refresh token using OAuth Playground
5. Restart application: `pm2 restart rsfm`

### Database Migration Fails

**Error:** `drizzle-kit push` fails

**Solutions:**
1. Check database connectivity:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
2. Verify database user has proper permissions
3. If data loss warning appears, use force:
   ```bash
   npm run db:push --force
   ```

### PM2 Process Crashes

**Check crash logs:**
```bash
pm2 logs rsfm --err --lines 50
```

**Common causes:**
- Out of memory → Increase server RAM or optimize queries
- Uncaught exceptions → Check application logs for errors
- Database connection pool exhausted → Review connection settings

**Restart PM2:**
```bash
pm2 restart rsfm
pm2 save
```

### Port 5000 Already in Use

**Find process using port:**
```bash
sudo lsof -i :5000
```

**Kill the process:**
```bash
sudo kill -9 <PID>
```

**Or change application port:**
```bash
# Edit .env
sudo nano /var/www/rsfm/.env

# Change PORT=5000 to PORT=5001
# Restart
pm2 restart rsfm
```

### Git Pull Fails

**Error:** Authentication failed

**Solutions:**
1. Update GitHub credentials:
   ```bash
   cd /var/www/rsfm
   git config credential.helper store
   git pull
   # Enter username and Personal Access Token
   ```

2. Or use SSH instead of HTTPS:
   ```bash
   git remote set-url origin git@github.com:ExeCuteUK/RSFM.git
   ```

## Production Checklist

Before going live, ensure:

### Security
- [ ] All environment variables are properly configured
- [ ] Database uses strong auto-generated password
- [ ] SESSION_SECRET is randomly generated
- [ ] Google service account private key is secure
- [ ] OAuth refresh token is not expired
- [ ] Server firewall allows port 5000 (or your custom port)
- [ ] SSH key authentication enabled (disable password auth)
- [ ] Server software is up to date

### Application
- [ ] PM2 process is running: `pm2 status`
- [ ] Auto-start is enabled: `pm2 startup`
- [ ] Database connection works
- [ ] Google Drive integration verified (test file upload)
- [ ] Gmail integration verified (test email sending)
- [ ] All required pages load without errors
- [ ] User registration/login works

### Monitoring
- [ ] PM2 logs are accessible: `pm2 logs rsfm`
- [ ] Database backups configured (scheduled task)
- [ ] Disk space monitoring enabled
- [ ] Server monitoring tools installed (optional: htop, iotop)

### Backup Strategy
- [ ] Automated database backups to Google Drive
- [ ] `.env` file backed up securely
- [ ] Document restore procedure
- [ ] Test restore process

### Performance
- [ ] Application responds quickly (< 2 seconds)
- [ ] Database queries optimized
- [ ] PM2 cluster mode considered for high traffic
- [ ] Static assets served efficiently

## Additional Resources

- **PM2 Documentation:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Google Cloud Console:** https://console.cloud.google.com/
- **OAuth 2.0 Playground:** https://developers.google.com/oauthplayground/

## Support

For issues specific to R.S Freight Manager, refer to:
- Application README: `/var/www/rsfm/README.md`
- Database documentation: See README Database Management section
- Backup/Restore scripts: `/var/www/rsfm/scripts/`

---

**Version:** 4.1.2 alpha  
**Last Updated:** October 10, 2025
