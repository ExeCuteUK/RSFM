import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Calendar as CalendarIcon, Flag, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay } from "date-fns";
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

  // Fetch events for the current month
  const startDate = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedDate), "yyyy-MM-dd");

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

  // Get events for selected date
  const selectedDateEvents = events.filter((event) => {
    const eventDate = event.start.date ? parseISO(event.start.date) : event.start.dateTime ? parseISO(event.start.dateTime) : null;
    return eventDate && isSameDay(eventDate, selectedDate);
  });

  // Get all event dates for calendar highlighting
  const eventDates = events
    .map((event) => {
      const dateStr = event.start.date || event.start.dateTime;
      return dateStr ? parseISO(dateStr) : null;
    })
    .filter((date): date is Date => date !== null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Team Calendar</h1>
          <p className="text-muted-foreground">Manage team holidays, annual leave, and view UK public holidays</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "MMMM yyyy")}
            </CardTitle>
            <CardDescription>
              {eventDates.length} event{eventDates.length !== 1 ? "s" : ""} this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading calendar...</p>
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={selectedDate}
                onMonthChange={setSelectedDate}
                modifiers={{
                  event: eventDates,
                }}
                modifiersStyles={{
                  event: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    fontWeight: "bold",
                  },
                }}
                className="rounded-md border"
                data-testid="calendar-view"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""} on this day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-events">
                No events scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <Card key={event.id} data-testid={`event-${event.id}`} className={event.isHoliday ? "border-primary/50 bg-primary/5" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold" data-testid="text-event-title">
                              {event.summary}
                            </h4>
                            {event.isHoliday && (
                              <Badge variant="outline" className="text-xs" data-testid="badge-holiday">
                                <Flag className="h-3 w-3 mr-1" />
                                UK Holiday
                              </Badge>
                            )}
                          </div>
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
    </div>
  );
}
