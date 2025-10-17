import { google } from 'googleapis';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

// Get Google Drive client using Service Account
async function getGoogleDriveClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error(
      'Google Drive not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.'
    );
  }

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

    // PRIORITY 1: Check if there's a Shared Drive with this exact name
    try {
      const drivesResponse = await drive.drives.list({
        fields: 'drives(id, name)'
      });

      if (drivesResponse.data.drives) {
        const sharedDrive = drivesResponse.data.drives.find((d: any) => d.name === folderName);
        if (sharedDrive) {
          // Found a Shared Drive! Cache its ID and return the drive's root (the drive ID itself)
          this.sharedDriveId = sharedDrive.id;
          this.rootFolderId = sharedDrive.id;
          console.log(`✓ Found Shared Drive: ${folderName} (ID: ${this.sharedDriveId})`);
          return this.rootFolderId;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not list Shared Drives (may not have access)');
    }

    // PRIORITY 2: Search in Shared Drives for a folder
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

    // PRIORITY 3: Search for shared folder (shared with service account from My Drive)
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

    // ERROR: No shared folder found and service account can't create in its own Drive
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

  // Get backups folder ID
  async getBackupsFolder(): Promise<string> {
    if (this.backupsFolderId) {
      return this.backupsFolderId;
    }

    const drive = await getGoogleDriveClient();
    const rootId = await this.getRootFolderForBackups(drive);
    this.backupsFolderId = await this.getOrCreateFolderForBackups(drive, rootId, 'Backups');
    return this.backupsFolderId;
  }

  // Get root folder for backups
  private async getRootFolderForBackups(drive: any): Promise<string> {
    const driveName = 'RS Freight Manager';

    // PRIORITY 1: Check if there's a Shared Drive with this exact name
    try {
      const drivesResponse = await drive.drives.list({
        fields: 'drives(id, name)'
      });

      if (drivesResponse.data.drives) {
        const sharedDrive = drivesResponse.data.drives.find((d: any) => d.name === driveName);
        if (sharedDrive) {
          // Found a Shared Drive! Cache its ID and return the drive's root (the drive ID itself)
          this.sharedDriveId = sharedDrive.id;
          console.log(`✓ Found Shared Drive: ${driveName} (ID: ${this.sharedDriveId})`);
          // The root of a Shared Drive is the drive ID itself
          return sharedDrive.id!;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not list Shared Drives (may not have access)');
    }

    // PRIORITY 2: Search for folder in Shared Drives (someone else's shared drive)
    const sharedDriveResponse = await drive.files.list({
      q: `name='${driveName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      corpora: 'allDrives',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)'
    });

    if (sharedDriveResponse.data.files && sharedDriveResponse.data.files.length > 0) {
      const folder = sharedDriveResponse.data.files[0];
      console.log(`✓ Found folder in Shared Drive: ${driveName} (${folder.id})`);
      return folder.id!;
    }

    // PRIORITY 3: Search for shared folder (from My Drive)
    const sharedResponse = await drive.files.list({
      q: `name='${driveName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (sharedResponse.data.files && sharedResponse.data.files.length > 0) {
      console.log(`✓ Found shared folder: ${driveName} (${sharedResponse.data.files[0].id})`);
      return sharedResponse.data.files[0].id!;
    }

    // ERROR: Service account cannot create folders
    throw new Error(
      `Google Drive folder "${driveName}" not found. ` +
      `Service accounts cannot create files in their own Drive. ` +
      `Please share a folder named "${driveName}" with the service account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`
    );
  }

  // Get or create subfolder for backups
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
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0] as DriveFile;
    }

    return null;
  }

  // Download a file and stream it to response
  async downloadObject(fileId: string, res: Response, cacheTtlSec: number = 3600, customFilename?: string) {
    try {
      const drive = await getGoogleDriveClient();

      // Get file metadata
      const metadata = await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType, size',
        supportsAllDrives: true
      });

      const headers: Record<string, string> = {
        'Content-Type': metadata.data.mimeType || 'application/octet-stream',
        'Content-Length': metadata.data.size || '0',
        'Cache-Control': `private, max-age=${cacheTtlSec}`,
      };

      // Set Content-Disposition with filename if provided
      if (customFilename) {
        headers['Content-Disposition'] = `attachment; filename="${customFilename}"`;
      }

      res.set(headers);

      // Download file content
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media', supportsAllDrives: true },
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
      fields: 'id',
      supportsAllDrives: true
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
      fields: 'id',
      supportsAllDrives: true
    });

    const fileId = file.data.id!;
    const objectPath = `/objects/${fileId}`;

    return { fileId, objectPath, filename: fileName };
  }

  // Upload invoice to dedicated RS Invoices folder
  async uploadInvoice(
    fileName: string, 
    buffer: Buffer, 
    mimeType: string = 'application/pdf'
  ): Promise<{ fileId: string; objectPath: string; filename: string }> {
    const drive = await getGoogleDriveClient();
    
    // Get root folder (RS Freight Manager)
    const rootId = await this.getRootFolder();
    
    // Get or create "RS Invoices" folder
    const invoicesFolderId = await this.getOrCreateFolder(rootId, 'RS Invoices');
    
    const fileMetadata = {
      name: fileName,
      parents: [invoicesFolderId]
    };

    const media = {
      mimeType: mimeType,
      body: Readable.from(buffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
      supportsAllDrives: true
    });

    const fileId = file.data.id!;
    const objectPath = `/objects/${fileId}`;

    console.log(`✓ Invoice uploaded to RS Invoices: ${fileName} (${fileId})`);
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
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true
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
        { fileId: fileId, alt: 'media', supportsAllDrives: true },
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
          },
          supportsAllDrives: true
        });
      } else {
        // Remove public access
        const permissions = await drive.permissions.list({
          fileId: fileId,
          fields: 'permissions(id, type)',
          supportsAllDrives: true
        });

        if (permissions.data.permissions) {
          for (const permission of permissions.data.permissions) {
            if (permission.type === 'anyone') {
              await drive.permissions.delete({
                fileId: fileId,
                permissionId: permission.id!,
                supportsAllDrives: true
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

  // Delete a file (moves to trash)
  async deleteFile(objectPath: string): Promise<void> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const fileId = objectPath.replace('/objects/', '');
    const drive = await getGoogleDriveClient();

    try {
      // Move to trash instead of permanent delete
      await drive.files.update({
        fileId: fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true
      });
      console.log(`✓ File moved to trash: ${fileId}`);
    } catch (error) {
      console.error('Delete file error:', error);
      throw new ObjectNotFoundError();
    }
  }

  // Upload backup to Google Drive
  async uploadBackup(backupName: string, buffer: Buffer): Promise<{ fileId: string; fileName: string }> {
    const drive = await getGoogleDriveClient();
    const backupsFolderId = await this.getBackupsFolder();
    
    const fileMetadata: any = {
      name: backupName,
      mimeType: 'application/zip',
      parents: [backupsFolderId]
    };

    // If using Shared Drive, add driveId parameter
    if (this.sharedDriveId) {
      console.log(`✓ Uploading backup to Shared Drive: ${this.sharedDriveId}`);
    }

    const media = {
      mimeType: 'application/zip',
      body: Readable.from(buffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
      supportsAllDrives: true
    });

    console.log(`✓ Backup uploaded successfully: ${backupName} (${file.data.id})`);

    return { 
      fileId: file.data.id!, 
      fileName: file.data.name! 
    };
  }

  // List backups from Google Drive
  async listBackups(): Promise<Array<{ id: string; name: string; createdTime?: string; size?: string }>> {
    const drive = await getGoogleDriveClient();
    const backupsFolderId = await this.getBackupsFolder();

    const response = await drive.files.list({
      q: `'${backupsFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, size)',
      orderBy: 'createdTime desc',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    return response.data.files || [];
  }

  // Download backup as buffer
  async downloadBackup(fileId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const drive = await getGoogleDriveClient();
    const { Readable } = await import('stream');

    try {
      // Get file metadata
      const metadata = await drive.files.get({
        fileId: fileId,
        fields: 'name',
        supportsAllDrives: true
      });

      // Download file content as stream
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const stream = response.data as Readable;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          reject(new ObjectNotFoundError());
        });
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`✓ Downloaded backup: ${metadata.data.name} (${buffer.length} bytes)`);
          resolve({
            buffer,
            fileName: metadata.data.name!
          });
        });
      });
    } catch (error) {
      console.error('Download backup error:', error);
      throw new ObjectNotFoundError();
    }
  }

  // Delete backup (moves to trash)
  async deleteBackup(fileId: string): Promise<void> {
    const drive = await getGoogleDriveClient();

    try {
      // Move to trash instead of permanent delete
      // Content Manager role can trash files, but only Manager role can permanently delete
      await drive.files.update({
        fileId: fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true
      });
      console.log(`✓ Backup moved to trash: ${fileId}`);
    } catch (error) {
      console.error('Delete backup error:', error);
      throw new ObjectNotFoundError();
    }
  }
}
