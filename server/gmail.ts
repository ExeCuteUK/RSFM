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

// ========== Email Reading Functions ==========

interface FetchEmailsOptions {
  folder?: 'inbox' | 'sent' | 'drafts' | 'starred' | 'spam' | 'trash' | 'archive' | 'all';
  maxResults?: number;
  pageToken?: string;
  sortBy?: 'date' | 'sender' | 'subject';
  sortOrder?: 'asc' | 'desc';
}

interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  date: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
  labels: string[];
  isUnread: boolean;
  isStarred: boolean;
}

function getLabelIdForFolder(folder: string): string {
  const labelMap: Record<string, string> = {
    inbox: 'INBOX',
    sent: 'SENT',
    drafts: 'DRAFT',
    starred: 'STARRED',
    spam: 'SPAM',
    trash: 'TRASH',
    all: '',
  };
  return labelMap[folder] || 'INBOX';
}

export async function fetchEmails(options: FetchEmailsOptions = {}): Promise<{
  emails: ParsedEmail[];
  nextPageToken?: string;
}> {
  const gmail = await getUncachableGmailClient();
  const { folder = 'inbox', maxResults = 50, pageToken, sortBy = 'date' } = options;
  
  let labelIds: string[] | undefined;
  let q: string | undefined;
  
  if (folder === 'archive') {
    // Archive: messages not in inbox, sent, trash, spam, or drafts
    q = '-in:inbox -in:sent -in:trash -in:spam -in:draft';
  } else if (folder !== 'all') {
    labelIds = [getLabelIdForFolder(folder)];
  }
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    labelIds,
    q,
    maxResults,
    pageToken,
  });
  
  const messages = response.data.messages || [];
  const emails: ParsedEmail[] = [];
  
  for (const message of messages) {
    if (message.id) {
      try {
        const email = await getEmail(message.id);
        emails.push(email);
      } catch (error) {
        console.error(`Failed to fetch email ${message.id}:`, error);
      }
    }
  }
  
  // Sort emails
  emails.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'sender') {
      comparison = a.from.localeCompare(b.from);
    } else if (sortBy === 'subject') {
      comparison = a.subject.localeCompare(b.subject);
    }
    return options.sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return {
    emails,
    nextPageToken: response.data.nextPageToken,
  };
}

export async function getEmail(messageId: string): Promise<ParsedEmail> {
  const gmail = await getUncachableGmailClient();
  
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  
  const message = response.data;
  const headers = message.payload?.headers || [];
  
  const getHeader = (name: string) => {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };
  
  const parseAddresses = (headerValue: string): string[] => {
    if (!headerValue) return [];
    return headerValue.split(',').map(addr => addr.trim());
  };
  
  let bodyText = '';
  let bodyHtml = '';
  const attachments: ParsedEmail['attachments'] = [];
  
  const extractBody = (parts: any[], parentMimeType?: string) => {
    if (!parts) return;
    
    for (const part of parts) {
      const mimeType = part.mimeType || '';
      
      if (part.parts) {
        extractBody(part.parts, mimeType);
      } else if (part.body?.data) {
        const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
        
        if (mimeType === 'text/plain') {
          bodyText = data;
        } else if (mimeType === 'text/html') {
          bodyHtml = data;
        }
      }
      
      if (part.filename && part.body?.attachmentId) {
        // Extract contentId from headers if present (for inline images)
        const contentIdHeader = part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id');
        const contentId = contentIdHeader?.value;
        
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || '',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
          ...(contentId && { contentId }),
        });
      }
    }
  };
  
  if (message.payload?.parts) {
    extractBody(message.payload.parts);
  } else if (message.payload?.body?.data) {
    const data = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    const mimeType = message.payload.mimeType || '';
    if (mimeType === 'text/plain') {
      bodyText = data;
    } else if (mimeType === 'text/html') {
      bodyHtml = data;
    }
  }
  
  const labels = message.labelIds || [];
  
  // Log subject and labels for debugging Thunderbird tags
  const subject = getHeader('subject');
  console.log(`Email: "${subject}" | Labels: ${JSON.stringify(labels)}`);
  
  return {
    id: message.id || '',
    threadId: message.threadId || '',
    from: getHeader('from'),
    to: parseAddresses(getHeader('to')),
    cc: parseAddresses(getHeader('cc')),
    bcc: parseAddresses(getHeader('bcc')),
    subject,
    date: getHeader('date'),
    snippet: message.snippet || '',
    bodyText,
    bodyHtml,
    attachments,
    labels,
    isUnread: labels.includes('UNREAD'),
    isStarred: labels.includes('STARRED'),
  };
}

// ========== Email Actions ==========

export async function markEmailAsRead(messageId: string, isRead: boolean = true): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  if (isRead) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } else {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: ['UNREAD'],
      },
    });
  }
}

export async function starEmail(messageId: string, isStarred: boolean = true): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  if (isStarred) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: ['STARRED'],
      },
    });
  } else {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['STARRED'],
      },
    });
  }
}

export async function deleteEmail(messageId: string): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

export async function archiveEmail(messageId: string): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
}

export async function moveToSpam(messageId: string): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: ['SPAM'],
      removeLabelIds: ['INBOX'],
    },
  });
}

// Cache for label ID lookups
let labelIdCache: Map<string, string> = new Map();

export async function getLabelIdByName(labelName: string): Promise<string | null> {
  // Check cache first
  if (labelIdCache.has(labelName)) {
    return labelIdCache.get(labelName)!;
  }
  
  const gmail = await getUncachableGmailClient();
  
  try {
    const response = await gmail.users.labels.list({
      userId: 'me',
    });
    
    const labels = response.data.labels || [];
    const label = labels.find(l => l.name === labelName);
    
    if (label && label.id) {
      // Cache the result
      labelIdCache.set(labelName, label.id);
      return label.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    return null;
  }
}

export async function modifyEmailLabels(messageId: string, addLabels: string[] = [], removeLabels: string[] = []): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  // Convert label names to IDs for custom labels
  const addLabelIds = await Promise.all(
    addLabels.map(async (label) => {
      // System labels (all uppercase) can be used directly
      if (label === label.toUpperCase() && ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(label)) {
        return label;
      }
      // Custom labels need to be converted to IDs
      const labelId = await getLabelIdByName(label);
      if (!labelId) {
        throw new Error(`Label not found: ${label}`);
      }
      return labelId;
    })
  );
  
  const removeLabelIds = await Promise.all(
    removeLabels.map(async (label) => {
      // System labels can be used directly
      if (label === label.toUpperCase() && ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'UNREAD'].includes(label)) {
        return label;
      }
      // Custom labels need to be converted to IDs
      const labelId = await getLabelIdByName(label);
      if (!labelId) {
        throw new Error(`Label not found: ${label}`);
      }
      return labelId;
    })
  );
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: addLabelIds.length > 0 ? addLabelIds : undefined,
      removeLabelIds: removeLabelIds.length > 0 ? removeLabelIds : undefined,
    },
  });
}

// ========== Draft Management ==========

export async function createDraft(options: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  draftId?: string;
}): Promise<{ id: string; message: { id: string } }> {
  const gmail = await getUncachableGmailClient();
  
  const messageParts = [
    `To: ${options.to}`,
  ];
  
  if (options.cc) {
    messageParts.push(`Cc: ${options.cc}`);
  }
  if (options.bcc) {
    messageParts.push(`Bcc: ${options.bcc}`);
  }
  
  messageParts.push(
    'MIME-Version: 1.0',
    `Subject: ${options.subject}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    options.body
  );
  
  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  if (options.draftId) {
    const result = await gmail.users.drafts.update({
      userId: 'me',
      id: options.draftId,
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });
    return result.data as { id: string; message: { id: string } };
  } else {
    const result = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });
    return result.data as { id: string; message: { id: string } };
  }
}

export async function deleteDraft(draftId: string): Promise<void> {
  const gmail = await getUncachableGmailClient();
  
  await gmail.users.drafts.delete({
    userId: 'me',
    id: draftId,
  });
}

export async function sendDraft(draftId: string): Promise<any> {
  const gmail = await getUncachableGmailClient();
  
  const result = await gmail.users.drafts.send({
    userId: 'me',
    requestBody: {
      id: draftId,
    },
  });
  
  return result.data;
}

export async function getUnreadCount(): Promise<number> {
  const gmail = await getUncachableGmailClient();
  
  const response = await gmail.users.labels.get({
    userId: 'me',
    id: 'INBOX',
  });
  
  return response.data.messagesUnread || 0;
}
