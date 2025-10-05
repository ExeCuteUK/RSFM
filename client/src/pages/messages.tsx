import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MailOpen, Trash2, Send, Paperclip, Download, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";

type Message = {
  id: number;
  senderId: string;
  senderName: string | null;
  recipientId: string;
  recipientName: string | null;
  subject: string;
  content: string;
  attachments: string[] | null;
  isRead: boolean;
  createdAt: string;
};

type User = {
  id: string;
  username: string;
  fullName: string | null;
};

const messageSchema = z.object({
  recipientId: z.string().min(1, "Please select a recipient"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  attachments: z.array(z.string()).optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      recipientId: "",
      subject: "",
      content: "",
      attachments: [],
    },
  });

  // Initialize Uppy for file uploads
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles: 10,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      },
      autoProceed: false,
    }).use(AwsS3, {
      async getUploadParameters(file) {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });
        const data = await response.json();
        return {
          method: "PUT",
          url: data.url,
          fields: {},
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        };
      },
    });

    uppyInstance.on("upload-success", (file, response) => {
      if (file?.name) {
        const uploadedUrl = (response.uploadURL as string).split("?")[0];
        setUploadedFiles((prev) => [...prev, uploadedUrl]);
      }
    });

    return uppyInstance;
  });

  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, [uppy]);

  // Handle userId parameter from URL to auto-open composer
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('userId');
    
    if (userIdParam && users.length > 0) {
      const targetUser = users.find(u => u.id === userIdParam);
      if (targetUser && targetUser.id !== user?.id) {
        form.setValue('recipientId', userIdParam);
        setIsComposerOpen(true);
        
        // Clear the URL parameter
        window.history.replaceState({}, '', '/messages');
      }
    }
  }, [users, user, form]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      return apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "Message sent successfully" });
      setIsComposerOpen(false);
      form.reset();
      uppy.cancelAll();
      setUploadedFiles([]);
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "Message deleted" });
      setSelectedMessage(null);
    },
  });

  const inbox = messages.filter((m) => m.recipientId === user?.id);
  const sent = messages.filter((m) => m.senderId === user?.id);
  const displayMessages = activeTab === "inbox" ? inbox : sent;

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (activeTab === "inbox" && !message.isRead) {
      markReadMutation.mutate(message.id);
    }
  };

  const handleSendMessage = async (data: MessageFormData) => {
    // Normalize uploaded file URLs and combine with attachments
    const normalizedFiles = uploadedFiles.length > 0
      ? await fetch("/api/objects/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: uploadedFiles }),
        }).then(res => res.json()).then(data => data.normalizedUrls)
      : [];

    sendMessageMutation.mutate({
      ...data,
      attachments: normalizedFiles,
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    const files = uppy.getFiles();
    if (files[index]) {
      uppy.removeFile(files[index].id);
    }
  };

  const handleComposerClose = (open: boolean) => {
    if (!open) {
      // Reset files when closing
      uppy.cancelAll();
      setUploadedFiles([]);
    }
    setIsComposerOpen(open);
  };

  const getUserDisplayName = (userId: string, fallbackName: string | null) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser?.fullName || foundUser?.username || fallbackName || "Unknown User";
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Internal communication system</p>
        </div>
        <Dialog open={isComposerOpen} onOpenChange={handleComposerClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-compose">
              <Send className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSendMessage)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="recipientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recipient">
                            <SelectValue placeholder="Select recipient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users
                            .filter((u) => u.id !== user?.id)
                            .sort((a, b) => {
                              const nameA = a.fullName || a.username;
                              const nameB = b.fullName || b.username;
                              return nameA.localeCompare(nameB);
                            })
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.fullName || u.username}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={6} data-testid="textarea-content" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <FormLabel>Attachments</FormLabel>
                  <Dashboard
                    uppy={uppy}
                    height={200}
                    theme="light"
                    hideUploadButton={true}
                    note="Upload files (max 10MB each, 10 files total)"
                  />
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1">
                      {uploadedFiles.map((file, idx) => {
                        const fileName = file.split("/").pop() || file;
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                            <span className="truncate flex-1">{fileName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttachment(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleComposerClose(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendMessageMutation.isPending} data-testid="button-send">
                    {sendMessageMutation.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <Card className="w-[400px] flex flex-col">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inbox" | "sent")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inbox" data-testid="tab-inbox">
                  Inbox {inbox.filter((m) => !m.isRead).length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {inbox.filter((m) => !m.isRead).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : displayMessages.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No {activeTab === "inbox" ? "received" : "sent"} messages
                </div>
              ) : (
                <div className="divide-y">
                  {displayMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`p-4 cursor-pointer hover-elevate ${
                        selectedMessage?.id === message.id ? "bg-accent" : ""
                      }`}
                      data-testid={`message-item-${message.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {activeTab === "inbox" && !message.isRead ? (
                            <Mail className="h-4 w-4 text-primary" />
                          ) : (
                            <MailOpen className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!message.isRead && activeTab === "inbox" ? "font-semibold" : ""}`}>
                              {activeTab === "inbox"
                                ? getUserDisplayName(message.senderId, message.senderName)
                                : getUserDisplayName(message.recipientId, message.recipientName)}
                            </p>
                            {message.attachments && message.attachments.length > 0 && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className={`text-sm truncate ${!message.isRead && activeTab === "inbox" ? "font-medium" : "text-muted-foreground"}`}>
                            {message.subject}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(message.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl">{selectedMessage.subject}</CardTitle>
                    <CardDescription className="mt-2">
                      {activeTab === "inbox" ? "From: " : "To: "}
                      {activeTab === "inbox"
                        ? getUserDisplayName(selectedMessage.senderId, selectedMessage.senderName)
                        : getUserDisplayName(selectedMessage.recipientId, selectedMessage.recipientName)}
                      <span className="ml-3 text-xs">
                        {format(new Date(selectedMessage.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                      </span>
                    </CardDescription>
                  </div>
                  {activeTab === "inbox" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(selectedMessage.id)}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="flex-1 p-6">
                <div className="whitespace-pre-wrap">{selectedMessage.content}</div>
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attachments:</p>
                      {selectedMessage.attachments.map((attachment, idx) => {
                        const fileName = attachment.split("/").pop() || attachment;
                        return (
                          <a
                            key={idx}
                            href={attachment}
                            download
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                            data-testid={`attachment-${idx}`}
                          >
                            <Download className="h-4 w-4" />
                            {fileName}
                          </a>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a message to read</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
