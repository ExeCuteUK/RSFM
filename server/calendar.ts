import { google } from 'googleapis';

let connectionSettings: any;

// Get authenticated Google Calendar client
export async function getCalendarClient() {
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

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  // Method 2: Fallback to Replit Connector (only works on Replit)
  const accessToken = await getReplitAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
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
    throw new Error('Calendar not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables, or use Replit connector.');
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
    throw new Error('Calendar not connected');
  }
  return accessToken;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    date?: string; // For all-day events (YYYY-MM-DD)
    dateTime?: string; // For timed events (ISO 8601)
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  creator?: {
    email?: string;
    displayName?: string;
  };
}

// List events from the shared calendar
export async function listCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  
  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is not set');
  }

  const calendar = await getCalendarClient();
  
  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    timeMax: endDate ? new Date(endDate).toISOString() : undefined,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || []).map(event => ({
    id: event.id || undefined,
    summary: event.summary || 'Untitled Event',
    description: event.description || undefined,
    start: {
      date: event.start?.date || undefined,
      dateTime: event.start?.dateTime || undefined,
    },
    end: {
      date: event.end?.date || undefined,
      dateTime: event.end?.dateTime || undefined,
    },
    creator: {
      email: event.creator?.email || undefined,
      displayName: event.creator?.displayName || undefined,
    }
  }));
}

// Create a new event in the shared calendar
export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  
  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is not set');
  }

  const calendar = await getCalendarClient();
  
  const response = await calendar.events.insert({
    calendarId: calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
    },
  });

  return {
    id: response.data.id || undefined,
    summary: response.data.summary || '',
    description: response.data.description || undefined,
    start: {
      date: response.data.start?.date || undefined,
      dateTime: response.data.start?.dateTime || undefined,
    },
    end: {
      date: response.data.end?.date || undefined,
      dateTime: response.data.end?.dateTime || undefined,
    },
  };
}

// Delete an event from the shared calendar
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  
  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is not set');
  }

  const calendar = await getCalendarClient();
  
  await calendar.events.delete({
    calendarId: calendarId,
    eventId: eventId,
  });
}

// Update an existing event
export async function updateCalendarEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  
  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is not set');
  }

  const calendar = await getCalendarClient();
  
  const response = await calendar.events.patch({
    calendarId: calendarId,
    eventId: eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
    },
  });

  return {
    id: response.data.id || undefined,
    summary: response.data.summary || '',
    description: response.data.description || undefined,
    start: {
      date: response.data.start?.date || undefined,
      dateTime: response.data.start?.dateTime || undefined,
    },
    end: {
      date: response.data.end?.date || undefined,
      dateTime: response.data.end?.dateTime || undefined,
    },
  };
}
