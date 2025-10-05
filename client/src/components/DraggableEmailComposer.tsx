import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Minus, GripHorizontal, Paperclip, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface EmailComposerData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: string[];
}

interface DraggableEmailComposerProps {
  data: EmailComposerData;
  onClose: () => void;
  onSend: (data: EmailComposerData) => void;
  onMinimize: () => void;
  isMinimized: boolean;
  isSending: boolean;
  recentEmails: string[];
  contactEmails: { email: string; name: string; type: string }[];
  onDataChange: (data: EmailComposerData) => void;
}

export function DraggableEmailComposer({
  data,
  onClose,
  onSend,
  onMinimize,
  isMinimized,
  isSending,
  recentEmails,
  contactEmails,
  onDataChange,
}: DraggableEmailComposerProps) {
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
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      onDataChange({
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
    onDataChange({
      ...data,
      attachments: newAttachments,
    });
  };

  if (isMinimized) {
    return null; // Taskbar will handle minimized display
  }

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
            onClick={onMinimize}
            data-testid="button-minimize-email"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onClose}
            data-testid="button-close-email"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* To Field */}
        <div className="space-y-1">
          <label className="text-sm font-medium">To:</label>
          <Popover open={emailPopoverOpen} onOpenChange={setEmailPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={emailPopoverOpen}
                className="w-full justify-start font-normal"
                data-testid="button-to-combobox"
              >
                {data.to || "Select or type email..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[550px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type recipient email..."
                  value={data.to}
                  onValueChange={(value) => onDataChange({ ...data, to: value })}
                  data-testid="input-to-search"
                />
                <CommandList>
                  <CommandEmpty>
                    {data.to ? `Press Enter to use: ${data.to}` : 'No emails found'}
                  </CommandEmpty>
                  {recentEmails.length > 0 && (
                    <CommandGroup heading="Recent">
                      {recentEmails
                        .filter(email => !data.to || email.toLowerCase().includes(data.to.toLowerCase()))
                        .map((email) => (
                        <CommandItem
                          key={`recent-${email}`}
                          value={email}
                          onSelect={(currentValue) => {
                            onDataChange({ ...data, to: currentValue });
                            setEmailPopoverOpen(false);
                          }}
                          data-testid={`email-option-${email}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              data.to === email ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {contactEmails.length > 0 && (
                    <CommandGroup heading="Contacts">
                      {contactEmails
                        .filter(contact => !data.to || 
                          contact.email.toLowerCase().includes(data.to.toLowerCase()) ||
                          contact.name.toLowerCase().includes(data.to.toLowerCase()))
                        .slice(0, 30)
                        .map((contact) => (
                        <CommandItem
                          key={`contact-${contact.email}`}
                          value={contact.email}
                          onSelect={(currentValue) => {
                            onDataChange({ ...data, to: currentValue });
                            setEmailPopoverOpen(false);
                          }}
                          data-testid={`email-option-${contact.email}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              data.to === contact.email ? "opacity-100" : "opacity-0"
                            )}
                          />
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
        </div>

        {/* CC and BCC Fields */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">CC (Optional):</label>
            <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={ccPopoverOpen}
                  className="w-full justify-start font-normal"
                  data-testid="button-cc-combobox"
                >
                  {data.cc || "Select or type email..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[270px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type CC email..."
                    value={data.cc}
                    onValueChange={(value) => onDataChange({ ...data, cc: value })}
                    data-testid="input-cc-search"
                  />
                  <CommandList>
                    <CommandEmpty>
                      {data.cc ? `Press Enter to use: ${data.cc}` : 'No emails found'}
                    </CommandEmpty>
                    {recentEmails.length > 0 && (
                      <CommandGroup heading="Recent">
                        {recentEmails
                          .filter(email => !data.cc || email.toLowerCase().includes(data.cc.toLowerCase()))
                          .map((email) => (
                          <CommandItem
                            key={`cc-recent-${email}`}
                            value={email}
                            onSelect={(currentValue) => {
                              onDataChange({ ...data, cc: currentValue });
                              setCcPopoverOpen(false);
                            }}
                            data-testid={`cc-option-${email}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                data.cc === email ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {contactEmails.length > 0 && (
                      <CommandGroup heading="Contacts">
                        {contactEmails
                          .filter(contact => !data.cc || 
                            contact.email.toLowerCase().includes(data.cc.toLowerCase()) ||
                            contact.name.toLowerCase().includes(data.cc.toLowerCase()))
                          .slice(0, 20)
                          .map((contact) => (
                          <CommandItem
                            key={`cc-contact-${contact.email}`}
                            value={contact.email}
                            onSelect={(currentValue) => {
                              onDataChange({ ...data, cc: currentValue });
                              setCcPopoverOpen(false);
                            }}
                            data-testid={`cc-option-${contact.email}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                data.cc === contact.email ? "opacity-100" : "opacity-0"
                              )}
                            />
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
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">BCC (Optional):</label>
            <Popover open={bccPopoverOpen} onOpenChange={setBccPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={bccPopoverOpen}
                  className="w-full justify-start font-normal"
                  data-testid="button-bcc-combobox"
                >
                  {data.bcc || "Select or type email..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[270px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type BCC email..."
                    value={data.bcc}
                    onValueChange={(value) => onDataChange({ ...data, bcc: value })}
                    data-testid="input-bcc-search"
                  />
                  <CommandList>
                    <CommandEmpty>
                      {data.bcc ? `Press Enter to use: ${data.bcc}` : 'No emails found'}
                    </CommandEmpty>
                    {recentEmails.length > 0 && (
                      <CommandGroup heading="Recent">
                        {recentEmails
                          .filter(email => !data.bcc || email.toLowerCase().includes(data.bcc.toLowerCase()))
                          .map((email) => (
                          <CommandItem
                            key={`bcc-recent-${email}`}
                            value={email}
                            onSelect={(currentValue) => {
                              onDataChange({ ...data, bcc: currentValue });
                              setBccPopoverOpen(false);
                            }}
                            data-testid={`bcc-option-${email}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                data.bcc === email ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {contactEmails.length > 0 && (
                      <CommandGroup heading="Contacts">
                        {contactEmails
                          .filter(contact => !data.bcc || 
                            contact.email.toLowerCase().includes(data.bcc.toLowerCase()) ||
                            contact.name.toLowerCase().includes(data.bcc.toLowerCase()))
                          .slice(0, 20)
                          .map((contact) => (
                          <CommandItem
                            key={`bcc-contact-${contact.email}`}
                            value={contact.email}
                            onSelect={(currentValue) => {
                              onDataChange({ ...data, bcc: currentValue });
                              setBccPopoverOpen(false);
                            }}
                            data-testid={`bcc-option-${contact.email}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                data.bcc === contact.email ? "opacity-100" : "opacity-0"
                              )}
                            />
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
          </div>
        </div>

        {/* Subject Field */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Subject:</label>
          <Input
            value={data.subject}
            onChange={(e) => onDataChange({ ...data, subject: e.target.value })}
            data-testid="input-subject"
          />
        </div>

        {/* Body Field */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Message:</label>
          <Textarea
            rows={7}
            value={data.body}
            onChange={(e) => onDataChange({ ...data, body: e.target.value })}
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
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-email">
          Cancel
        </Button>
        <Button
          onClick={() => onSend(data)}
          disabled={isSending}
          data-testid="button-send-email"
        >
          {isSending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  );
}
