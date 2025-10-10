import { GoogleDriveStorageService } from '../server/googleDriveStorage.js';

async function cleanupOldBackups() {
  try {
    const driveService = new GoogleDriveStorageService();
    
    console.log("Listing backups from Google Drive...\n");
    
    const backups = await driveService.listBackups();
    
    if (backups.length === 0) {
      console.log("No backups found in Google Drive");
      return;
    }
    
    console.log(`Found ${backups.length} backup(s):\n`);
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   Created: ${backup.createdTime}`);
      console.log(`   Size: ${backup.size}`);
      console.log(`   ID: ${backup.fileId}\n`);
    });
    
    // Keep only the most recent backup, delete all others
    if (backups.length > 1) {
      const backupsToDelete = backups.slice(1); // Skip the first (most recent)
      
      console.log(`Deleting ${backupsToDelete.length} old backup(s)...\n`);
      
      for (const backup of backupsToDelete) {
        console.log(`Deleting: ${backup.name}...`);
        await driveService.deleteBackup(backup.fileId);
        console.log(`✓ Deleted: ${backup.name}\n`);
      }
      
      console.log(`✓ Cleanup complete! Kept most recent backup: ${backups[0].name}`);
    } else {
      console.log("Only one backup exists, nothing to delete");
    }
    
  } catch (error) {
    console.error("Error cleaning up backups:", error);
    process.exit(1);
  }
}

cleanupOldBackups();
