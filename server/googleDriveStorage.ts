import { google } from 'googleapis';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

let connectionSettings: any;

async function getAccessToken() {
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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
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

  constructor() {}

  // Get or create the root folder for the app
  async getRootFolder(): Promise<string> {
    if (this.rootFolderId) {
      return this.rootFolderId;
    }

    const drive = await getGoogleDriveClient();
    const folderName = 'RS_Freight_Manager';

    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      this.rootFolderId = response.data.files[0].id!;
      return this.rootFolderId;
    }

    // Create root folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    this.rootFolderId = folder.data.id!;
    return this.rootFolderId;
  }

  // Get or create a subfolder
  async getOrCreateFolder(parentId: string, folderName: string): Promise<string> {
    const drive = await getGoogleDriveClient();

    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
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
      fields: 'id'
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
}
