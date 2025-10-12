import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Calendar as CalendarIcon, Flag, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay, startOfWeek, endOfWeek, addDays, addMonths, subMonths, getWeek, isSameMonth, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  creator?: {
    email?: string;
    displayName?: string;
  };
  calendarId?: string;
  isHoliday?: boolean;
}

export default function TeamCalendar() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    isAllDay: true,
  });

  // Fetch events for the current month (including adjacent days for week view)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const startDate = format(calendarStart, "yyyy-MM-dd");
  const endDate = format(calendarEnd, "yyyy-MM-dd");

  const { data: events = [], isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch calendar events");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (event: Omit<CalendarEvent, "id">) => {
      return await apiRequest("POST", "/api/calendar/events", event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Success", description: "Event added to team calendar" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create event",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ eventId, event }: { eventId: string; event: Partial<CalendarEvent> }) => {
      return await apiRequest("PATCH", `/api/calendar/events/${eventId}`, event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Success", description: "Event updated successfully" });
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update event",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest("DELETE", `/api/calendar/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Success", description: "Event removed from calendar" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete event",
        variant: "destructive" 
      });
    },
  });

  const handleCreateEvent = () => {
    const eventData: Omit<CalendarEvent, "id"> = {
      summary: newEvent.summary,
      description: newEvent.description,
      start: newEvent.isAllDay 
        ? { date: newEvent.startDate }
        : { dateTime: `${newEvent.startDate}T${newEvent.startTime}:00` },
      end: newEvent.isAllDay
        ? { date: newEvent.endDate }
        : { dateTime: `${newEvent.endDate}T${newEvent.endTime}:00` },
    };
    
    createMutation.mutate(eventData);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    
    // Extract date and time from event
    const startDate = event.start.date || event.start.dateTime?.split('T')[0] || format(new Date(), "yyyy-MM-dd");
    const endDate = event.end.date || event.end.dateTime?.split('T')[0] || format(new Date(), "yyyy-MM-dd");
    const startTime = event.start.dateTime?.split('T')[1]?.substring(0, 5) || "09:00";
    const endTime = event.end.dateTime?.split('T')[1]?.substring(0, 5) || "17:00";
    const isAllDay = !!event.start.date;
    
    setNewEvent({
      summary: event.summary,
      description: event.description || "",
      startDate,
      endDate,
      startTime,
      endTime,
      isAllDay,
    });
    
    setIsEditDialogOpen(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent?.id) return;
    
    const eventData: Partial<CalendarEvent> = {
      summary: newEvent.summary,
      description: newEvent.description,
      start: newEvent.isAllDay 
        ? { date: newEvent.startDate }
        : { dateTime: `${newEvent.startDate}T${newEvent.startTime}:00` },
      end: newEvent.isAllDay
        ? { date: newEvent.endDate }
        : { dateTime: `${newEvent.endDate}T${newEvent.endTime}:00` },
    };
    
    updateMutation.mutate({ eventId: editingEvent.id, event: eventData });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate(eventId);
    }
  };

  const resetForm = () => {
    setNewEvent({
      summary: "",
      description: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "17:00",
      isAllDay: true,
    });
    setEditingEvent(null);
  };

  // Get events for a specific date (including multi-day events)
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const startDate = event.start.date ? parseISO(event.start.date) : event.start.dateTime ? parseISO(event.start.dateTime) : null;
      const endDate = event.end.date ? parseISO(event.end.date) : event.end.dateTime ? parseISO(event.end.dateTime) : null;
      
      if (!startDate) return false;
      
      // For all-day events, end date is exclusive (next day), so we check if date is before end
      if (event.start.date && event.end.date && endDate) {
        return date >= startDate && date < endDate;
      }
      
      // For timed events, check if the date falls within the event range
      if (event.start.dateTime && event.end.dateTime && endDate) {
        // Get start of day for comparison
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const eventStart = new Date(startDate);
        eventStart.setHours(0, 0, 0, 0);
        const eventEnd = new Date(endDate);
        const eventEndMidnight = new Date(endDate);
        eventEndMidnight.setHours(0, 0, 0, 0);
        
        // If event ends at midnight, treat it as exclusive (don't include that day)
        if (endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0) {
          return checkDate >= eventStart && checkDate < eventEndMidnight;
        }
        
        // Otherwise include the end day if the event extends past midnight
        return checkDate >= eventStart && checkDate <= eventEndMidnight;
      }
      
      // Fallback: check if within the same day
      return isSameDay(startDate, date);
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const days: Date[] = [];
    let currentDay = calendarStart;
    
    while (currentDay <= calendarEnd) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Navigation functions
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="container mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Team Calendar</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-event">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-event">
            <DialogHeader>
              <DialogTitle>Add Calendar Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Event Title *</Label>
                <Input
                  id="summary"
                  data-testid="input-event-title"
                  placeholder="e.g., John Smith - Annual Leave"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-event-description"
                  placeholder="Additional details..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="all-day">All Day Event</Label>
                  <p className="text-sm text-muted-foreground">Event lasts the entire day</p>
                </div>
                <Switch
                  id="all-day"
                  checked={newEvent.isAllDay}
                  onCheckedChange={(checked) => setNewEvent({ ...newEvent, isAllDay: checked })}
                  data-testid="switch-all-day"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    data-testid="input-start-date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    data-testid="input-end-date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  />
                </div>
              </div>

              {!newEvent.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      data-testid="input-start-time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      data-testid="input-end-time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEvent}
                disabled={!newEvent.summary || !newEvent.startDate || !newEvent.endDate || createMutation.isPending}
                data-testid="button-save-event"
              >
                {createMutation.isPending ? "Adding..." : "Add Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent data-testid="dialog-edit-event">
            <DialogHeader>
              <DialogTitle>Edit Calendar Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-summary">Event Title *</Label>
                <Input
                  id="edit-summary"
                  data-testid="input-edit-event-title"
                  placeholder="e.g., John Smith - Annual Leave"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  data-testid="input-edit-event-description"
                  placeholder="Additional details..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-all-day">All Day Event</Label>
                  <p className="text-sm text-muted-foreground">Event lasts the entire day</p>
                </div>
                <Switch
                  id="edit-all-day"
                  checked={newEvent.isAllDay}
                  onCheckedChange={(checked) => setNewEvent({ ...newEvent, isAllDay: checked })}
                  data-testid="switch-edit-all-day"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date *</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    data-testid="input-edit-start-date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date *</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    data-testid="input-edit-end-date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  />
                </div>
              </div>

              {!newEvent.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-startTime">Start Time *</Label>
                    <Input
                      id="edit-startTime"
                      type="time"
                      data-testid="input-edit-start-time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-endTime">End Time *</Label>
                    <Input
                      id="edit-endTime"
                      type="time"
                      data-testid="input-edit-end-time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-edit-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateEvent}
                disabled={!newEvent.summary || !newEvent.startDate || !newEvent.endDate || updateMutation.isPending}
                data-testid="button-update-event"
              >
                {updateMutation.isPending ? "Updating..." : "Update Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertDescription>
            {(error as Error).message || "Failed to load calendar events"}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                data-testid="button-previous-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" data-testid="text-selected-date">
                Selected Date : {format(selectedDate, "dd/MM/yy")}
              </span>
              <Button
                variant="outline"
                onClick={goToToday}
                data-testid="button-today"
                className="h-9"
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              {/* Calendar Header */}
              <div className="grid bg-muted/50" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
                <div className="p-1 text-center text-xs font-medium border-r">Wk</div>
                <div className="p-1 text-center text-xs font-medium border-r">Mon</div>
                <div className="p-1 text-center text-xs font-medium border-r">Tue</div>
                <div className="p-1 text-center text-xs font-medium border-r">Wed</div>
                <div className="p-1 text-center text-xs font-medium border-r">Thu</div>
                <div className="p-1 text-center text-xs font-medium border-r">Fri</div>
                <div className="p-1 text-center text-xs font-medium border-r">Sat</div>
                <div className="p-1 text-center text-xs font-medium">Sun</div>
              </div>

              {/* Calendar Grid */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid border-t" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
                  {/* Week Number */}
                  <div className="p-1 text-center text-xs font-medium bg-muted/30 border-r flex items-center justify-center">
                    {getWeek(week[0])}
                  </div>
                  
                  {/* Days */}
                  {week.map((day, dayIndex) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <div
                        key={dayIndex}
                        className={`relative min-h-20 p-1 border-r last:border-r-0 cursor-pointer hover-elevate ${
                          !isCurrentMonth ? "bg-muted/20" : ""
                        }`}
                        onClick={() => setSelectedDate(day)}
                        data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/30 border-2 border-primary pointer-events-none" />
                        )}
                        <div className={`relative text-xs font-medium mb-0.5 ${
                          !isCurrentMonth ? "text-muted-foreground" : ""
                        } ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]" : ""}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${
                                event.isHoliday
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                              }`}
                              data-testid={`calendar-event-${event.id}`}
                              title={event.summary}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!event.isHoliday) {
                                  handleEditEvent(event);
                                }
                              }}
                            >
                              {event.start.dateTime && format(parseISO(event.start.dateTime), "HH:mm")} {event.summary}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground pl-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Sidebar */}
      <Card className="mt-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-4 w-4" />
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
          <CardDescription className="text-xs">
            {getEventsForDate(selectedDate).length} event{getEventsForDate(selectedDate).length !== 1 ? "s" : ""} on this day
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-events">
              No events scheduled for this day
            </p>
          ) : (
            <div className="space-y-3">
              {getEventsForDate(selectedDate).map((event) => (
                <Card key={event.id} data-testid={`event-detail-${event.id}`} className={event.isHoliday ? "border-amber-500/50 bg-amber-500/5" : "border-blue-500/50 bg-blue-500/5"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold" data-testid="text-event-title">
                            {event.summary}
                          </h4>
                          {event.isHoliday && (
                            <Badge variant="outline" className="text-xs border-amber-500/50" data-testid="badge-holiday">
                              <Flag className="h-3 w-3 mr-1" />
                              UK Holiday
                            </Badge>
                          )}
                        </div>
                        {event.start.dateTime && (
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(event.start.dateTime), "h:mm a")} - {format(parseISO(event.end.dateTime!), "h:mm a")}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid="text-event-description">
                            {event.description}
                          </p>
                        )}
                        {event.creator?.displayName && !event.isHoliday && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Created by: {event.creator.displayName}
                          </p>
                        )}
                      </div>
                      {!event.isHoliday && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEvent(event)}
                            data-testid="button-edit-event"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => event.id && handleDeleteEvent(event.id)}
                            disabled={deleteMutation.isPending}
                            data-testid="button-delete-event"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
