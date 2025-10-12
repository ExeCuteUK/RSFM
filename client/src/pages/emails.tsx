import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailComposer } from "@/components/EmailComposer";
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  Archive,
  Mail,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal,
  Loader2,
  Edit3,
} from "lucide-react";

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

type Folder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'spam' | 'trash' | 'archive';
type SortBy = 'date' | 'sender' | 'subject';

const folders = [
  { id: 'inbox' as Folder, label: 'Inbox', icon: Inbox },
  { id: 'sent' as Folder, label: 'Sent Mail', icon: Send },
  { id: 'drafts' as Folder, label: 'Drafts', icon: FileText },
  { id: 'starred' as Folder, label: 'Starred', icon: Star },
  { id: 'spam' as Folder, label: 'Junk', icon: Mail },
  { id: 'trash' as Folder, label: 'Bin', icon: Trash2 },
  { id: 'archive' as Folder, label: 'Archives', icon: Archive },
];

export default function Emails() {
  const { toast } = useToast();
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  const [originalEmail, setOriginalEmail] = useState<ParsedEmail | null>(null);

  const { data: emailsData, isLoading: isLoadingEmails } = useQuery<{
    emails: ParsedEmail[];
    nextPageToken?: string;
  }>({
    queryKey: ['/api/emails', activeFolder, sortBy, sortOrder],
    queryFn: async () => {
      return await apiRequest("GET", `/api/emails/${activeFolder}?sortBy=${sortBy}&sortOrder=${sortOrder}`);
    },
  });

  const selectedEmail = emailsData?.emails?.find(e => e.id === selectedEmailId);

  const markReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      return await apiRequest("POST", `/api/emails/${id}/mark-read`, { isRead });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
    },
  });

  const starMutation = useMutation({
    mutationFn: async ({ id, isStarred }: { id: string; isStarred: boolean }) => {
      return await apiRequest("POST", `/api/emails/${id}/star`, { isStarred });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/emails/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      setSelectedEmailId(null);
      toast({
        title: "Email deleted",
        description: "Email moved to trash",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/emails/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      setSelectedEmailId(null);
      toast({
        title: "Email archived",
        description: "Email has been archived",
      });
    },
  });

  const spamMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/emails/${id}/spam`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      setSelectedEmailId(null);
      toast({
        title: "Moved to junk",
        description: "Email marked as spam",
      });
    },
  });

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleEmailClick = (email: ParsedEmail) => {
    setSelectedEmailId(email.id);
    if (email.isUnread) {
      markReadMutation.mutate({ id: email.id, isRead: true });
    }
  };

  const handleCompose = () => {
    setComposerMode('compose');
    setOriginalEmail(null);
    setComposerOpen(true);
  };

  const handleReply = () => {
    if (selectedEmail) {
      setComposerMode('reply');
      setOriginalEmail(selectedEmail);
      setComposerOpen(true);
    }
  };

  const handleReplyAll = () => {
    if (selectedEmail) {
      setComposerMode('replyAll');
      setOriginalEmail(selectedEmail);
      setComposerOpen(true);
    }
  };

  const handleForward = () => {
    if (selectedEmail) {
      setComposerMode('forward');
      setOriginalEmail(selectedEmail);
      setComposerOpen(true);
    }
  };

  const filteredEmails = emailsData?.emails?.filter(email => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.from.toLowerCase().includes(query) ||
      email.subject.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="h-screen flex" data-testid="page-emails">
      {/* Left Sidebar - Folders */}
      <div className="w-[20%] border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b">
          <Button 
            onClick={handleCompose} 
            className="w-full" 
            data-testid="button-compose"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Compose
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {folders.map((folder) => {
              const count = folder.id === 'inbox' 
                ? emailsData?.emails?.filter(e => e.isUnread).length || 0
                : 0;
              
              return (
                <Button
                  key={folder.id}
                  variant={activeFolder === folder.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setSelectedEmailId(null);
                  }}
                  data-testid={`folder-${folder.id}`}
                >
                  <folder.icon className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">{folder.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Middle Pane - Email List */}
      <div className="w-[40%] border-r flex flex-col">
        {/* Toolbar */}
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Column Headers */}
        <div className="px-3 py-2 border-b bg-muted/30 grid grid-cols-12 gap-2 text-sm font-medium">
          <div className="col-span-1"></div>
          <button
            className="col-span-4 flex items-center gap-1 hover-elevate px-2 py-1 rounded-md text-left"
            onClick={() => handleSort('sender')}
            data-testid="sort-sender"
          >
            From
            {sortBy === 'sender' && (
              sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <button
            className="col-span-5 flex items-center gap-1 hover-elevate px-2 py-1 rounded-md text-left"
            onClick={() => handleSort('subject')}
            data-testid="sort-subject"
          >
            Subject
            {sortBy === 'subject' && (
              sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <button
            className="col-span-2 flex items-center gap-1 hover-elevate px-2 py-1 rounded-md text-left"
            onClick={() => handleSort('date')}
            data-testid="sort-date"
          >
            Date
            {sortBy === 'date' && (
              sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Email List */}
        <ScrollArea className="flex-1">
          {isLoadingEmails ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No emails in this folder
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={`px-3 py-3 grid grid-cols-12 gap-2 cursor-pointer hover-elevate ${
                    selectedEmailId === email.id ? 'bg-muted' : ''
                  } ${email.isUnread ? 'font-semibold' : ''}`}
                  onClick={() => handleEmailClick(email)}
                  data-testid={`email-row-${email.id}`}
                >
                  <div className="col-span-1 flex items-start gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        starMutation.mutate({ id: email.id, isStarred: !email.isStarred });
                      }}
                      data-testid={`star-${email.id}`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="col-span-4 truncate text-sm">
                    {email.from}
                  </div>
                  <div className="col-span-5 truncate text-sm">
                    {email.subject || '(no subject)'}
                    <span className="text-muted-foreground ml-2">- {email.snippet}</span>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground text-right">
                    {new Date(email.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Pane - Reading Pane */}
      <div className="w-[40%] flex flex-col">
        {!selectedEmail ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an email to read</p>
            </div>
          </div>
        ) : (
          <>
            {/* Email Header */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-semibold flex-1" data-testid="email-subject">
                  {selectedEmail.subject || '(no subject)'}
                </h2>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium">From:</span>
                  <span data-testid="email-from">{selectedEmail.from}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium">To:</span>
                  <span data-testid="email-to">{selectedEmail.to.join(', ')}</span>
                </div>
                {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground font-medium">Cc:</span>
                    <span>{selectedEmail.cc.join(', ')}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium">Date:</span>
                  <span data-testid="email-date">
                    {new Date(selectedEmail.date).toLocaleString()}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReply}
                  data-testid="button-reply"
                >
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReplyAll}
                  data-testid="button-reply-all"
                >
                  <ReplyAll className="mr-2 h-4 w-4" />
                  Reply All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForward}
                  data-testid="button-forward"
                >
                  <Forward className="mr-2 h-4 w-4" />
                  Forward
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => archiveMutation.mutate(selectedEmail.id)}
                  disabled={archiveMutation.isPending}
                  data-testid="button-archive"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => spamMutation.mutate(selectedEmail.id)}
                  disabled={spamMutation.isPending}
                  data-testid="button-spam"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Junk
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(selectedEmail.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Email Body */}
            <ScrollArea className="flex-1 p-4">
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mb-4 p-3 border rounded-md bg-muted/30">
                  <div className="text-sm font-medium mb-2">
                    Attachments ({selectedEmail.attachments.length})
                  </div>
                  <div className="space-y-1">
                    {selectedEmail.attachments.map((attachment, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {attachment.filename} ({Math.round(attachment.size / 1024)} KB)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                data-testid="email-body"
              >
                {selectedEmail.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {selectedEmail.bodyText || selectedEmail.snippet}
                  </pre>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Email Composer Dialog */}
      <EmailComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        mode={composerMode}
        originalEmail={originalEmail || undefined}
      />
    </div>
  );
}
