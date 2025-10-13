import { google } from 'googleapis';

// Get authenticated Google Calendar client
export async function getCalendarClient() {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error(
      'Calendar not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables.'
    );
  }

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
  calendarId?: string; // Which calendar this event belongs to
  isHoliday?: boolean; // True if from UK Holidays calendar (read-only)
}

// List events from both team calendar and UK Holidays calendar
export async function listCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  const teamCalendarId = process.env.GOOGLE_CALENDAR_ID;
  const ukHolidaysCalendarId = 'en.uk#holiday@group.v.calendar.google.com';
  
  if (!teamCalendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is not set');
  }

  const calendar = await getCalendarClient();
  const allEvents: CalendarEvent[] = [];
  const errors: string[] = [];
  
  // Fetch team calendar events
  try {
    const teamResponse = await calendar.events.list({
      calendarId: teamCalendarId,
      timeMin: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      timeMax: endDate ? new Date(endDate).toISOString() : undefined,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const teamEvents = (teamResponse.data.items || []).map(event => ({
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
      },
      calendarId: teamCalendarId,
      isHoliday: false,
    }));
    
    allEvents.push(...teamEvents);
  } catch (error) {
    const errorMsg = `Failed to fetch team calendar: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('Team calendar error:', error);
    errors.push(errorMsg);
  }
  
  // Fetch UK Holidays calendar events (public calendar, no auth needed for read)
  try {
    const holidaysResponse = await calendar.events.list({
      calendarId: ukHolidaysCalendarId,
      timeMin: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      timeMax: endDate ? new Date(endDate).toISOString() : undefined,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const holidayEvents = (holidaysResponse.data.items || []).map(event => ({
      id: event.id || undefined,
      summary: event.summary || 'Holiday',
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
        email: 'UK Holidays',
        displayName: 'UK Holidays',
      },
      calendarId: ukHolidaysCalendarId,
      isHoliday: true,
    }));
    
    allEvents.push(...holidayEvents);
  } catch (error) {
    const errorMsg = `Failed to fetch UK holidays: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('UK holidays error:', error);
    errors.push(errorMsg);
  }
  
  // If both calendars failed, throw an error
  if (errors.length === 2) {
    throw new Error(`Calendar fetch failed: ${errors.join('; ')}`);
  }
  
  // If one calendar failed, log it but continue with partial results
  if (errors.length === 1) {
    console.warn('Partial calendar data returned:', errors[0]);
  }
  
  // Sort all events by start time
  allEvents.sort((a, b) => {
    const aStart = a.start.dateTime || a.start.date || '';
    const bStart = b.start.dateTime || b.start.date || '';
    return aStart.localeCompare(bStart);
  });

  return allEvents;
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
