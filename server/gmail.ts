import { google } from 'googleapis';

let connectionSettings: any;

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGmailClient() {
  // Method 1: Try OAuth with Client ID/Secret/Refresh Token (works on Ubuntu and Replit)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost' // Redirect URI (not used for refresh token flow)
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  // Method 2: Fallback to Replit Connector (only works on Replit)
  const accessToken = await getReplitAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
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
    throw new Error('Gmail not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables, or use Replit connector.');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getGmailConnectionStatus() {
  try {
    // Try OAuth credentials first (works on Ubuntu and Replit)
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
      try {
        const gmail = await getUncachableGmailClient();
        const profile = await gmail.users.getProfile({ userId: 'me' });
        return { 
          connected: true, 
          email: profile.data.emailAddress || null 
        };
      } catch (error) {
        return { connected: false, email: null };
      }
    }

    // Fallback to Replit connector
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken) {
      return { connected: false, email: null };
    }

    const connection = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connection) {
      return { connected: false, email: null };
    }

    // Try to get user email from Gmail API
    try {
      const gmail = await getUncachableGmailClient();
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return { 
        connected: true, 
        email: profile.data.emailAddress || null 
      };
    } catch (error) {
      return { connected: true, email: null };
    }
  } catch (error) {
    return { connected: false, email: null };
  }
}

export async function sendEmailWithAttachment(options: {
  to: string;
  subject: string;
  body: string;
  attachmentUrl: string;
  attachmentFilename: string;
}) {
  const gmail = await getUncachableGmailClient();
  
  // Fetch the file from the URL
  const response = await fetch(options.attachmentUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64File = Buffer.from(arrayBuffer).toString('base64');
  
  // Create email with attachment
  const boundary = '----boundary';
  const messageParts = [
    `To: ${options.to}`,
    'MIME-Version: 1.0',
    `Subject: ${options.subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    options.body,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${options.attachmentFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${options.attachmentFilename}"`,
    '',
    base64File,
    `--${boundary}--`
  ];
  
  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
  
  return result.data;
}

export async function sendEmailWithMultipleAttachments(options: {
  to: string;
  subject: string;
  body: string;
  attachmentUrls: string[];
}) {
  const gmail = await getUncachableGmailClient();
  
  const boundary = '----boundary';
  const messageParts = [
    `To: ${options.to}`,
    'MIME-Version: 1.0',
    `Subject: ${options.subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    options.body,
    ''
  ];
  
  // Process each attachment
  for (const attachmentUrl of options.attachmentUrls) {
    const response = await fetch(attachmentUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString('base64');
    
    // Extract filename from URL
    const filename = attachmentUrl.split('/').pop() || 'attachment';
    
    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (filename.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (filename.toLowerCase().match(/\.(jpg|jpeg)$/)) {
      contentType = 'image/jpeg';
    } else if (filename.toLowerCase().endsWith('.png')) {
      contentType = 'image/png';
    }
    
    messageParts.push(
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      base64File,
      ''
    );
  }
  
  messageParts.push(`--${boundary}--`);
  
  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
  
  return result.data;
}
