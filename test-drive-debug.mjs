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

console.log('Testing shared folder search...');

const response = await drive.files.list({
  q: `name='RS Freight Manager' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`,
  fields: 'files(id, name)',
  spaces: 'drive',
  supportsAllDrives: true,
  includeItemsFromAllDrives: true
});

console.log('Shared folders found:', JSON.stringify(response.data.files, null, 2));
