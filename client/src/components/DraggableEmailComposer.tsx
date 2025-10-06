import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Minus, GripHorizontal, Paperclip, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmail } from "@/contexts/EmailContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";

export function DraggableEmailComposer() {
  const { 
    emailComposerData, 
    closeEmailComposer, 
    updateEmailDraft,
    removeEmailDraft,
    recentEmails,
    addToRecentEmails 
  } = useEmail();
  const { minimizeWindow, activeWindow } = useWindowManager();
  
  const { data: contactEmails = [] } = useQuery<{ email: string; name: string; type: string }[]>({
    queryKey: ['/api/contacts/emails'],
    staleTime: 5 * 60 * 1000
  });
  
  // All hooks must be called before any conditional returns
  const [position, setPosition] = useState(() => {
    const width = 600;
    const height = 690;
    return {
      x: Math.max(0, (window.innerWidth - width) / 2),
      y: Math.max(0, (window.innerHeight - height) / 2),
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [emailPopoverOpen, setEmailPopoverOpen] = useState(false);
  const [ccPopoverOpen, setCcPopoverOpen] = useState(false);
  const [bccPopoverOpen, setBccPopoverOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newToEmail, setNewToEmail] = useState("");
  const [newCcEmail, setNewCcEmail] = useState("");
  const [newBccEmail, setNewBccEmail] = useState("");
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Send email mutation - MUST be called before conditional return
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const { isMinimized: _, attachments, metadata, ...restData } = emailData;
      const sendData = {
        ...restData,
        attachmentUrls: attachments || []
      };
      return apiRequest("POST", "/api/gmail/send-with-attachments", sendData);
    },
    onSuccess: async () => {
      if (!emailComposerData) return;
      
      toast({ title: "Email sent successfully" });
      
      if (emailComposerData.to) addToRecentEmails(emailComposerData.to);
      
      // Auto-update status based on metadata
      if (emailComposerData.metadata?.source && emailComposerData.metadata?.shipmentId) {
        const { source, shipmentId } = emailComposerData.metadata;
        
        try {
          if (source === 'book-delivery-customer') {
            // Update Book Delivery Customer status to Orange (2)
            await apiRequest("PATCH", `/api/import-shipments/${shipmentId}/book-delivery-customer-status`, { status: 2 });
            queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] });
          } else if (source === 'advise-clearance-agent-import') {
            // Update Advise Clearance to Agent status to Green (3) for import
            await apiRequest("PATCH", `/api/import-shipments/${shipmentId}/clearance-status`, { status: 3 });
            queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] });
            queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] });
          } else if (source === 'advise-clearance-agent') {
            // Update Advise Clearance to Agent status to Green (3) for custom clearances
            await apiRequest("PATCH", `/api/custom-clearances/${shipmentId}/advise-agent-status`, { status: 3 });
            queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] });
          } else if (source === 'advise-clearance-agent-export') {
            // Update Advise Clearance to Agent status to Green (3) for export
            await apiRequest("PATCH", `/api/export-shipments/${shipmentId}/advise-clearance-to-agent-status`, { status: 3 });
            queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] });
            queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] });
          } else if (source === 'send-pod-customer') {
            // Update Send POD To Customer status to Green (3)
            await apiRequest("PATCH", `/api/import-shipments/${shipmentId}/send-pod-to-customer-status`, { status: 3 });
            queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] });
          } else if (source === 'send-pod-customer-export') {
            // Update Send POD To Customer status to Green (3) for export shipments
            await apiRequest("PATCH", `/api/export-shipments/${shipmentId}/send-pod-to-customer-status`, { status: 3 });
            queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] });
          }
        } catch (error) {
          console.error('Failed to update status:', error);
        }
      }
      
      removeEmailDraft(emailComposerData.id);
      closeEmailComposer();
    },
    onError: (error) => {
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });
  
  // Now we can conditionally return
  if (!emailComposerData || emailComposerData.isMinimized) return null;
  
  const data = emailComposerData;

  // Helper function to update email data - PRESERVES metadata from window payload
  const handleDataChange = (updatedData: typeof data) => {
    const { isMinimized: _, ...draftData } = updatedData;
    
    // CRITICAL: Preserve metadata from the active window's payload if it exists
    const existingMetadata = activeWindow?.payload?.metadata;
    const finalDraftData = existingMetadata 
      ? { ...draftData, metadata: existingMetadata }
      : draftData;
    
    updateEmailDraft(data.id, finalDraftData);
  };

  // Helper functions for managing email addresses
  const addToEmail = (email: string) => {
    if (!email.trim()) return;
    const trimmedEmail = email.trim();
    if (!data.to.includes(trimmedEmail)) {
      handleDataChange({ ...data, to: [...data.to, trimmedEmail] });
      setNewToEmail("");
      setEmailPopoverOpen(false);
    }
  };

  const removeToEmail = (email: string) => {
    handleDataChange({ ...data, to: data.to.filter(e => e !== email) });
  };

  const addCcEmail = (email: string) => {
    if (!email.trim()) return;
    const trimmedEmail = email.trim();
    if (!data.cc.includes(trimmedEmail)) {
      handleDataChange({ ...data, cc: [...data.cc, trimmedEmail] });
      setNewCcEmail("");
      setCcPopoverOpen(false);
    }
  };

  const removeCcEmail = (email: string) => {
    handleDataChange({ ...data, cc: data.cc.filter(e => e !== email) });
  };

  const addBccEmail = (email: string) => {
    if (!email.trim()) return;
    const trimmedEmail = email.trim();
    if (!data.bcc.includes(trimmedEmail)) {
      handleDataChange({ ...data, bcc: [...data.bcc, trimmedEmail] });
      setNewBccEmail("");
      setBccPopoverOpen(false);
    }
  };

  const removeBccEmail = (email: string) => {
    handleDataChange({ ...data, bcc: data.bcc.filter(e => e !== email) });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep window within viewport bounds
      const maxX = window.innerWidth - 600; // composer width
      const maxY = window.innerHeight - 690; // composer height

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (composerRef.current) {
      const rect = composerRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Get presigned upload URL
        const uploadResponse = await fetch('/api/objects/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadURL } = await uploadResponse.json();

        // Upload file to presigned URL
        const uploadFileResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadFileResponse.ok) {
          throw new Error('Failed to upload file');
        }

        // Normalize the URL
        const normalizeResponse = await fetch('/api/objects/normalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [uploadURL] }),
        });

        const { paths } = await normalizeResponse.json();
        if (paths && paths.length > 0) {
          uploadedUrls.push(paths[0]);
        }
      }

      // Update attachments
      handleDataChange({
        ...data,
        attachments: [...data.attachments, ...uploadedUrls],
      });

      toast({
        title: 'Files uploaded successfully',
        description: `${uploadedUrls.length} file(s) added to email`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...data.attachments];
    newAttachments.splice(index, 1);
    handleDataChange({
      ...data,
      attachments: newAttachments,
    });
  };

  const handleMinimize = () => {
    const { isMinimized: _, ...draftData } = data;
    // CRITICAL: Preserve metadata from the active window's payload if it exists
    const existingMetadata = activeWindow?.payload?.metadata;
    const finalDraftData = existingMetadata 
      ? { ...draftData, metadata: existingMetadata }
      : draftData;
    updateEmailDraft(data.id, finalDraftData);
    minimizeWindow(data.id);
  };

  return (
    <div
      ref={composerRef}
      className="fixed bg-background border border-border rounded-lg shadow-2xl z-50 flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "600px",
        maxHeight: "690px",
      }}
      data-testid="draggable-email-composer"
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 cursor-move rounded-t-lg"
        onMouseDown={handleMouseDown}
        data-testid="email-composer-header"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">New Email</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleMinimize}
            data-testid="button-minimize-email"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={closeEmailComposer}
            data-testid="button-close-email"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* To Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium">To:</label>
          <div className="flex gap-2">
            <Popover open={emailPopoverOpen} onOpenChange={setEmailPopoverOpen}>
              <PopoverTrigger asChild>
                <Input
                  placeholder="Add recipient email..."
                  value={newToEmail}
                  onChange={(e) => setNewToEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToEmail(newToEmail);
                    }
                  }}
                  onFocus={() => setEmailPopoverOpen(true)}
                  data-testid="input-to-email"
                  className="flex-1"
                />
              </PopoverTrigger>
              <PopoverContent className="w-[550px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandEmpty>
                      {newToEmail ? `Press Enter to add: ${newToEmail}` : 'Type to search...'}
                    </CommandEmpty>
                    {recentEmails.length > 0 && (
                      <CommandGroup heading="Recent">
                        {recentEmails
                          .filter(email => !newToEmail || email.toLowerCase().includes(newToEmail.toLowerCase()))
                          .filter(email => !data.to.includes(email))
                          .map((email) => (
                          <CommandItem
                            key={`recent-${email}`}
                            value={email}
                            onSelect={() => addToEmail(email)}
                            data-testid={`email-option-${email}`}
                          >
                            {email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {contactEmails.length > 0 && (
                      <CommandGroup heading="Contacts">
                        {contactEmails
                          .filter(contact => !newToEmail || 
                            contact.email.toLowerCase().includes(newToEmail.toLowerCase()) ||
                            contact.name.toLowerCase().includes(newToEmail.toLowerCase()))
                          .filter(contact => !data.to.includes(contact.email))
                          .slice(0, 30)
                          .map((contact) => (
                          <CommandItem
                            key={`contact-${contact.email}`}
                            value={contact.email}
                            onSelect={() => addToEmail(contact.email)}
                            data-testid={`email-option-${contact.email}`}
                          >
                            <div className="flex flex-col">
                              <span>{contact.email}</span>
                              {contact.name && (
                                <span className="text-xs text-muted-foreground">
                                  {contact.name} • {contact.type}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => addToEmail(newToEmail)}
              data-testid="button-add-to-email"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {data.to.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.to.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeToEmail(email)}
                    className="hover-elevate active-elevate-2 rounded-full"
                    data-testid={`button-remove-to-${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* CC and BCC Fields */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">CC (Optional):</label>
            <div className="flex gap-2">
              <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                <PopoverTrigger asChild>
                  <Input
                    placeholder="Add CC email..."
                    value={newCcEmail}
                    onChange={(e) => setNewCcEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCcEmail(newCcEmail);
                      }
                    }}
                    onFocus={() => setCcPopoverOpen(true)}
                    data-testid="input-cc-email"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-[270px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandEmpty>
                        {newCcEmail ? `Press Enter to add: ${newCcEmail}` : 'Type to search...'}
                      </CommandEmpty>
                      {recentEmails.length > 0 && (
                        <CommandGroup heading="Recent">
                          {recentEmails
                            .filter(email => !newCcEmail || email.toLowerCase().includes(newCcEmail.toLowerCase()))
                            .filter(email => !data.cc.includes(email))
                            .map((email) => (
                            <CommandItem
                              key={`cc-recent-${email}`}
                              value={email}
                              onSelect={() => addCcEmail(email)}
                              data-testid={`cc-option-${email}`}
                            >
                              {email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {contactEmails.length > 0 && (
                        <CommandGroup heading="Contacts">
                          {contactEmails
                            .filter(contact => !newCcEmail || 
                              contact.email.toLowerCase().includes(newCcEmail.toLowerCase()) ||
                              contact.name.toLowerCase().includes(newCcEmail.toLowerCase()))
                            .filter(contact => !data.cc.includes(contact.email))
                            .slice(0, 20)
                            .map((contact) => (
                            <CommandItem
                              key={`cc-contact-${contact.email}`}
                              value={contact.email}
                              onSelect={() => addCcEmail(contact.email)}
                              data-testid={`cc-option-${contact.email}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm">{contact.email}</span>
                                {contact.name && (
                                  <span className="text-xs text-muted-foreground">
                                    {contact.name}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => addCcEmail(newCcEmail)}
                data-testid="button-add-cc-email"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {data.cc.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.cc.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeCcEmail(email)}
                      className="hover-elevate active-elevate-2 rounded-full"
                      data-testid={`button-remove-cc-${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">BCC (Optional):</label>
            <div className="flex gap-2">
              <Popover open={bccPopoverOpen} onOpenChange={setBccPopoverOpen}>
                <PopoverTrigger asChild>
                  <Input
                    placeholder="Add BCC email..."
                    value={newBccEmail}
                    onChange={(e) => setNewBccEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBccEmail(newBccEmail);
                      }
                    }}
                    onFocus={() => setBccPopoverOpen(true)}
                    data-testid="input-bcc-email"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-[270px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandEmpty>
                        {newBccEmail ? `Press Enter to add: ${newBccEmail}` : 'Type to search...'}
                      </CommandEmpty>
                      {recentEmails.length > 0 && (
                        <CommandGroup heading="Recent">
                          {recentEmails
                            .filter(email => !newBccEmail || email.toLowerCase().includes(newBccEmail.toLowerCase()))
                            .filter(email => !data.bcc.includes(email))
                            .map((email) => (
                            <CommandItem
                              key={`bcc-recent-${email}`}
                              value={email}
                              onSelect={() => addBccEmail(email)}
                              data-testid={`bcc-option-${email}`}
                            >
                              {email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {contactEmails.length > 0 && (
                        <CommandGroup heading="Contacts">
                          {contactEmails
                            .filter(contact => !newBccEmail || 
                              contact.email.toLowerCase().includes(newBccEmail.toLowerCase()) ||
                              contact.name.toLowerCase().includes(newBccEmail.toLowerCase()))
                            .filter(contact => !data.bcc.includes(contact.email))
                            .slice(0, 20)
                            .map((contact) => (
                            <CommandItem
                              key={`bcc-contact-${contact.email}`}
                              value={contact.email}
                              onSelect={() => addBccEmail(contact.email)}
                              data-testid={`bcc-option-${contact.email}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm">{contact.email}</span>
                                {contact.name && (
                                  <span className="text-xs text-muted-foreground">
                                    {contact.name}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => addBccEmail(newBccEmail)}
                data-testid="button-add-bcc-email"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {data.bcc.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.bcc.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeBccEmail(email)}
                      className="hover-elevate active-elevate-2 rounded-full"
                      data-testid={`button-remove-bcc-${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject Field */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Subject:</label>
          <Input
            value={data.subject}
            onChange={(e) => handleDataChange({ ...data, subject: e.target.value })}
            data-testid="input-subject"
          />
        </div>

        {/* Body Field */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Message:</label>
          <Textarea
            rows={7}
            value={data.body}
            onChange={(e) => handleDataChange({ ...data, body: e.target.value })}
            data-testid="textarea-body"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">
              Attachments {data.attachments.length > 0 && `(${data.attachments.length})`}
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-add-attachment"
            >
              <Paperclip className="h-3 w-3 mr-1" />
              <span className="text-xs">{isUploading ? 'Uploading...' : 'Add Files'}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
          </div>
          {data.attachments.length > 0 && (
            <div className="grid grid-cols-2 gap-1">
              {data.attachments.filter(file => file).map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-1.5 py-1 bg-muted/50 rounded"
                  data-testid={`attachment-${idx}`}
                >
                  <span className="text-xs truncate flex-1">{file.split('/').pop()}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-1"
                    onClick={() => handleRemoveAttachment(idx)}
                    data-testid={`button-remove-attachment-${idx}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-2 px-4 py-3 border-t bg-muted/50">
        <Button variant="outline" onClick={closeEmailComposer} data-testid="button-cancel-email">
          Cancel
        </Button>
        <Button
          onClick={() => sendEmailMutation.mutate(data)}
          disabled={sendEmailMutation.isPending}
          data-testid="button-send-email"
        >
          {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  );
}
