import { google } from 'googleapis';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

let connectionSettings: any;

// Get Google Drive client using Service Account (for Ubuntu) or Replit Connector (fallback)
async function getGoogleDriveClient() {
  // Method 1: Try Service Account (works on Ubuntu and Replit)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    return google.drive({ version: 'v3', auth: authClient as any });
  }

  // Method 2: Fallback to Replit Connector (only works on Replit)
  const accessToken = await getReplitAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Get Google Drive client for backups - PREFERS OAuth (can write to personal drives)
async function getGoogleDriveClientForBackups() {
  // Method 1: Try Replit OAuth Connector FIRST (can write to personal "My Drive")
  try {
    const accessToken = await getReplitAccessToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    console.log('✓ Using OAuth for backups (can write to personal Drive)');
    return google.drive({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.log('OAuth not available, falling back to service account');
  }

  // Method 2: Fallback to Service Account (only works with Shared Drives)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    console.log('⚠️  Using service account for backups (only works with Shared Drives, not personal "My Drive")');
    return google.drive({ version: 'v3', auth: authClient as any });
  }

  throw new Error('No Google Drive authentication available for backups');
}

// Get access token from Replit Connector (legacy method for Replit deployments)
async function getReplitAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Google Drive not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables, or use Replit connector.');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export class GoogleDriveStorageService {
  private rootFolderId: string | null = null;
  private publicFolderId: string | null = null;
  private privateFolderId: string | null = null;
  private backupsFolderId: string | null = null;
  private sharedDriveId: string | null = null;  // Cache driveId for Shared Drive uploads

  constructor() {}

  // Get or create the root folder for the app
  async getRootFolder(): Promise<string> {
    if (this.rootFolderId) {
      return this.rootFolderId;
    }

    const drive = await getGoogleDriveClient();
    const folderName = 'RS Freight Manager';

    // PRIORITY 1: Search in Shared Drives (team drives)
    // Service accounts can write to Shared Drives - check this FIRST
    const sharedDriveResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      corpora: 'allDrives',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (sharedDriveResponse.data.files && sharedDriveResponse.data.files.length > 0) {
      this.rootFolderId = sharedDriveResponse.data.files[0].id!;
      console.log(`✓ Found folder in Shared Drive: ${folderName} (${this.rootFolderId})`);
      return this.rootFolderId;
    }

    // PRIORITY 2: Search for shared folder (shared with service account from My Drive)
    const sharedResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (sharedResponse.data.files && sharedResponse.data.files.length > 0) {
      this.rootFolderId = sharedResponse.data.files[0].id!;
      console.log(`✓ Found shared folder: ${folderName} (${this.rootFolderId})`);
      return this.rootFolderId;
    }

    // PRIORITY 3: Search for existing folder at root level (fallback for OAuth users)
    const rootResponse = await drive.files.list({
      q: `name='${folderName}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (rootResponse.data.files && rootResponse.data.files.length > 0) {
      this.rootFolderId = rootResponse.data.files[0].id!;
      console.log(`✓ Found root folder: ${folderName} (${this.rootFolderId})`);
      return this.rootFolderId;
    }

    // ERROR: No shared folder found and can't create in service account's Drive
    throw new Error(
      `Google Drive folder "${folderName}" not found. ` +
      `Service accounts cannot create files in their own Drive. ` +
      `Please share a folder named "${folderName}" with the service account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`
    );
  }

  // Get or create a subfolder
  async getOrCreateFolder(parentId: string, folderName: string): Promise<string> {
    const drive = await getGoogleDriveClient();

    // Search for existing folder (supports shared drives)
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create folder (supports shared drives)
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
      supportsAllDrives: true
    });

    return folder.data.id!;
  }

  // Get public folder ID
  async getPublicFolder(): Promise<string> {
    if (this.publicFolderId) {
      return this.publicFolderId;
    }

    const rootId = await this.getRootFolder();
    this.publicFolderId = await this.getOrCreateFolder(rootId, 'public');
    return this.publicFolderId;
  }

  // Get private folder ID
  async getPrivateFolder(): Promise<string> {
    if (this.privateFolderId) {
      return this.privateFolderId;
    }

    const rootId = await this.getRootFolder();
    this.privateFolderId = await this.getOrCreateFolder(rootId, 'private');
    return this.privateFolderId;
  }

  // Get backups folder ID (uses OAuth client for write access to personal drives)
  async getBackupsFolder(): Promise<string> {
    if (this.backupsFolderId) {
      return this.backupsFolderId;
    }

    const drive = await getGoogleDriveClientForBackups();
    const rootId = await this.getRootFolderForBackups(drive);
    this.backupsFolderId = await this.getOrCreateFolderForBackups(drive, rootId, 'Backups');
    return this.backupsFolderId;
  }

  // Get root folder for backups (uses provided OAuth drive client)
  private async getRootFolderForBackups(drive: any): Promise<string> {
    const folderName = 'RS Freight Manager';

    // PRIORITY 1: Search in Shared Drives (team drives)
    const sharedDriveResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, driveId)',  // Request driveId to cache it
      corpora: 'allDrives',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (sharedDriveResponse.data.files && sharedDriveResponse.data.files.length > 0) {
      const folder = sharedDriveResponse.data.files[0];
      
      // Cache the driveId if this folder is in a Shared Drive
      if (folder.driveId) {
        this.sharedDriveId = folder.driveId;
        console.log(`✓ Found folder in Shared Drive: ${folderName} (${folder.id}), driveId: ${folder.driveId}`);
      } else {
        console.log(`✓ Found folder in Shared Drive: ${folderName} (${folder.id})`);
      }
      
      return folder.id!;
    }

    // PRIORITY 2: Search for shared folder (from My Drive)
    const sharedResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (sharedResponse.data.files && sharedResponse.data.files.length > 0) {
      console.log(`✓ Found shared folder: ${folderName} (${sharedResponse.data.files[0].id})`);
      return sharedResponse.data.files[0].id!;
    }

    // PRIORITY 3: Search for folder at root level
    const rootResponse = await drive.files.list({
      q: `name='${folderName}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (rootResponse.data.files && rootResponse.data.files.length > 0) {
      console.log(`✓ Found root folder: ${folderName} (${rootResponse.data.files[0].id})`);
      return rootResponse.data.files[0].id!;
    }

    // Create root folder (OAuth can create in user's Drive)
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root']
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    console.log(`✓ Created root folder: ${folderName} (${folder.data.id})`);
    return folder.data.id!;
  }

  // Get or create subfolder for backups (uses provided OAuth drive client)
  private async getOrCreateFolderForBackups(drive: any, parentId: string, folderName: string): Promise<string> {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (response.data.files && response.data.files.length > 0) {
      console.log(`✓ Found folder: ${folderName} (${response.data.files[0].id})`);
      return response.data.files[0].id!;
    }

    // Create folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
      supportsAllDrives: true
    });

    console.log(`✓ Created folder: ${folderName} (${folder.data.id})`);
    return folder.data.id!;
  }

  // Search for a file in public folder
  async searchPublicObject(fileName: string): Promise<DriveFile | null> {
    const drive = await getGoogleDriveClient();
    const publicFolderId = await this.getPublicFolder();

    const response = await drive.files.list({
      q: `name='${fileName}' and '${publicFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0] as DriveFile;
    }

    return null;
  }

  // Download a file and stream it to response
  async downloadObject(fileId: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      const drive = await getGoogleDriveClient();

      // Get file metadata
      const metadata = await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType, size'
      });

      res.set({
        'Content-Type': metadata.data.mimeType || 'application/octet-stream',
        'Content-Length': metadata.data.size || '0',
        'Cache-Control': `private, max-age=${cacheTtlSec}`,
      });

      // Download file content
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      response.data.on('error', (err: Error) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });

      response.data.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    }
  }

  // Upload a file to Google Drive
  async uploadFile(fileName: string, buffer: Buffer, mimeType: string = 'application/octet-stream', isPublic: boolean = false): Promise<{ fileId: string; objectPath: string }> {
    const drive = await getGoogleDriveClient();
    const folderId = isPublic ? await this.getPublicFolder() : await this.getPrivateFolder();
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: mimeType,
      body: Readable.from(buffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    const fileId = file.data.id!;
    const objectPath = `/objects/${fileId}`;

    return { fileId, objectPath };
  }

  // Upload a file to organized job folder structure
  async uploadFileToJobFolder(
    fileName: string, 
    buffer: Buffer, 
    mimeType: string,
    jobType: 'Import Shipments' | 'Export Shipments' | 'Custom Clearances' | 'Messages',
    jobRef: string,
    documentType: 'Transport Documents' | 'POD' | 'Clearance Documents' | 'RS Invoice' | null = null
  ): Promise<{ fileId: string; objectPath: string; filename: string }> {
    const drive = await getGoogleDriveClient();
    
    // Get root folder
    const rootId = await this.getRootFolder();
    
    // Get or create job type folder (e.g., "Import Shipments")
    const jobTypeFolder = await this.getOrCreateFolder(rootId, jobType);
    
    // Get or create job reference folder (e.g., "26001")
    const jobRefFolder = await this.getOrCreateFolder(jobTypeFolder, jobRef);
    
    // Get final folder ID (with or without document type subfolder)
    let folderId = jobRefFolder;
    if (documentType) {
      folderId = await this.getOrCreateFolder(jobRefFolder, documentType);
    }
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: mimeType,
      body: Readable.from(buffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    const fileId = file.data.id!;
    const objectPath = `/objects/${fileId}`;

    return { fileId, objectPath, filename: fileName };
  }

  // Generate an upload URL (for Google Drive, we'll handle uploads differently)
  async getObjectEntityUploadURL(filename?: string): Promise<{ uploadURL: string; objectPath: string; fileId: string }> {
    // For Google Drive, we'll use a different approach
    // We'll create a placeholder and return info needed for direct upload
    const fileId = filename || randomUUID();
    const privateFolderId = await this.getPrivateFolder();
    
    return {
      uploadURL: `/api/upload-to-drive`,
      objectPath: `/objects/${fileId}`,
      fileId: fileId
    };
  }

  // Get file by object path (converts /objects/fileId to fileId and retrieves)
  async getObjectEntityFile(objectPath: string): Promise<DriveFile> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const fileId = objectPath.replace('/objects/', '');
    const drive = await getGoogleDriveClient();

    try {
      const response = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size'
      });

      return response.data as DriveFile;
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  // Download file as buffer
  async getObjectBuffer(objectPath: string): Promise<Buffer> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const fileId = objectPath.replace('/objects/', '');
    const drive = await getGoogleDriveClient();

    try {
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  // Normalize object path (convert Google Drive URLs to /objects/ format)
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already in /objects/ format, return as is
    if (rawPath.startsWith('/objects/')) {
      return rawPath;
    }

    // If it's a Google Drive URL, extract file ID
    if (rawPath.includes('drive.google.com')) {
      const match = rawPath.match(/\/d\/([^/]+)/);
      if (match) {
        return `/objects/${match[1]}`;
      }
    }

    return rawPath;
  }

  // Set public/private visibility (Google Drive permissions)
  async trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: { visibility: 'public' | 'private' }): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    if (!normalizedPath.startsWith('/objects/')) {
      return normalizedPath;
    }

    const fileId = normalizedPath.replace('/objects/', '');
    const drive = await getGoogleDriveClient();

    try {
      if (aclPolicy.visibility === 'public') {
        // Make file publicly readable
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      } else {
        // Remove public access
        const permissions = await drive.permissions.list({
          fileId: fileId,
          fields: 'permissions(id, type)'
        });

        if (permissions.data.permissions) {
          for (const permission of permissions.data.permissions) {
            if (permission.type === 'anyone') {
              await drive.permissions.delete({
                fileId: fileId,
                permissionId: permission.id!
              });
            }
          }
        }
      }

      return normalizedPath;
    } catch (error) {
      console.error('Error setting ACL policy:', error);
      return normalizedPath;
    }
  }

  // Check if user can access an object
  async canAccessObjectEntity({
    userId,
    fileId,
    requestedPermission = 'read'
  }: {
    userId?: string;
    fileId: string;
    requestedPermission?: 'read' | 'write';
  }): Promise<boolean> {
    // For now, assume all authenticated users can access files
    // You can implement more granular permissions based on your needs
    return true;
  }

  // Delete a file
  async deleteFile(objectPath: string): Promise<void> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const fileId = objectPath.replace('/objects/', '');
    const drive = await getGoogleDriveClient();

    try {
      await drive.files.delete({ fileId: fileId });
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  // Upload backup to Google Drive
  async uploadBackup(backupName: string, buffer: Buffer): Promise<{ fileId: string; fileName: string }> {
    const drive = await getGoogleDriveClientForBackups();
    const backupsFolderId = await this.getBackupsFolder();
    
    const fileMetadata: any = {
      name: backupName,
      mimeType: 'application/zip',
      parents: [backupsFolderId]
    };

    const media = {
      mimeType: 'application/zip',
      body: Readable.from(buffer)
    };

    // Prepare create options with Shared Drive support
    const createOptions: any = {
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
      supportsAllDrives: true
    };

    // Use the cached driveId if available (set during getRootFolderForBackups)
    if (this.sharedDriveId) {
      createOptions.driveId = this.sharedDriveId;
      console.log(`✅ Uploading to Shared Drive: ${this.sharedDriveId}`);
    } else {
      console.log(`📁 Uploading to personal Drive (no Shared Drive detected)`);
    }

    const file = await drive.files.create(createOptions);

    return { 
      fileId: file.data.id!,
      fileName: file.data.name!
    };
  }

  // List all backups in Google Drive
  async listBackups(): Promise<Array<{ fileId: string; name: string; size: string; createdTime: string }>> {
    const drive = await getGoogleDriveClientForBackups();
    const backupsFolderId = await this.getBackupsFolder();

    const response = await drive.files.list({
      q: `'${backupsFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime)',
      orderBy: 'createdTime desc',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    return (response.data.files || []).map(file => ({
      fileId: file.id!,
      name: file.name!,
      size: file.size || '0',
      createdTime: file.createdTime || ''
    }));
  }

  // Download backup from Google Drive
  async downloadBackup(fileId: string): Promise<Buffer> {
    const drive = await getGoogleDriveClientForBackups();

    try {
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  // Delete backup from Google Drive
  async deleteBackup(fileId: string): Promise<void> {
    const drive = await getGoogleDriveClientForBackups();

    try {
      await drive.files.delete({ fileId: fileId, supportsAllDrives: true });
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }
}
