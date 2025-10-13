import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const authClient = await auth.getClient();
const drive = google.drive({ version: 'v3', auth: authClient });

const folderId = '16IUMEoI0lw7GCtl4fqZwrdoyEmyXfzQF';

console.log('Searching for Backups subfolder...');
const backupsResponse = await drive.files.list({
  q: `name='Backups' and '${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  fields: 'files(id, name)',
  spaces: 'drive'
});

console.log('Backups folders found:', JSON.stringify(backupsResponse.data.files, null, 2));

if (backupsResponse.data.files && backupsResponse.data.files.length > 0) {
  const backupsFolderId = backupsResponse.data.files[0].id;
  console.log('\nSearching for backup files in folder:', backupsFolderId);
  
  const filesResponse = await drive.files.list({
    q: `'${backupsFolderId}' in parents and trashed=false`,
    fields: 'files(id, name, size, createdTime)',
    spaces: 'drive'
  });
  
  console.log('Backup files found:', JSON.stringify(filesResponse.data.files, null, 2));
}
