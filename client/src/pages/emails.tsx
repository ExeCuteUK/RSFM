import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
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
  Tag,
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
    contentId?: string;
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
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterImportant, setFilterImportant] = useState(false);
  const [filterAttachments, setFilterAttachments] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(true);
  const [processedEmailHtml, setProcessedEmailHtml] = useState<string>('');

  const { 
    data: emailsData, 
    isLoading: isLoadingEmails, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['/api/emails', activeFolder],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        ...(pageParam && { pageToken: pageParam }),
      });
      const response = await apiRequest("GET", `/api/emails/${activeFolder}?${params}`);
      const result = await response.json();
      return result;
    },
    getNextPageParam: (lastPage) => lastPage?.nextPageToken ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  // Client-side sorting to avoid re-fetching
  const allEmails = emailsData?.pages.flatMap(page => page.emails) || [];
  const sortedEmails = [...allEmails].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'sender') {
      comparison = a.from.localeCompare(b.from);
    } else if (sortBy === 'subject') {
      comparison = a.subject.localeCompare(b.subject);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  const selectedEmail = sortedEmails.find(e => e.id === selectedEmailId);
  
  if (error) {
    console.error('Email fetch error:', error);
  }

  const markReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      return await apiRequest("POST", `/api/emails/${id}/mark-read`, { isRead });
    },
    onMutate: async ({ id, isRead }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/emails'] });

      // Snapshot the previous value
      const previousEmails = queryClient.getQueryData(['/api/emails', activeFolder]);

      // Optimistically update the cache for infinite query
      queryClient.setQueryData(
        ['/api/emails', activeFolder],
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              emails: page.emails.map((email: ParsedEmail) =>
                email.id === id ? { ...email, isUnread: !isRead } : email
              ),
            })),
          };
        }
      );

      return { previousEmails };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousEmails) {
        queryClient.setQueryData(['/api/emails', activeFolder], context.previousEmails);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
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

  const filteredEmails = sortedEmails.filter(email => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        email.from.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    // Unread filter
    if (filterUnread && !email.isUnread) return false;
    
    // Tags label filter - check for RS-TAG label
    if (filterImportant) {
      const hasRsTag = email.labels.includes('RS-TAG');
      if (!hasRsTag) return false;
    }
    
    // Attachments filter
    if (filterAttachments && email.attachments.length === 0) return false;
    
    return true;
  });
  
  const handleCheckMail = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
    toast({
      title: "Checking for new mail...",
    });
  };

  const labelMutation = useMutation({
    mutationFn: async ({ id, label, add }: { id: string; label: string; add: boolean }) => {
      return await apiRequest("POST", `/api/emails/${id}/label`, { label, add });
    },
    onMutate: async ({ id, label, add }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/emails'] });

      // Snapshot the previous value
      const previousEmails = queryClient.getQueryData(['/api/emails', activeFolder]);

      // Optimistically update the cache for infinite query
      queryClient.setQueryData(
        ['/api/emails', activeFolder],
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              emails: page.emails.map((email: ParsedEmail) => {
                if (email.id === id) {
                  const updatedLabels = add
                    ? [...email.labels, label]
                    : email.labels.filter(l => l !== label);
                  return { ...email, labels: updatedLabels };
                }
                return email;
              }),
            })),
          };
        }
      );

      return { previousEmails };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousEmails) {
        queryClient.setQueryData(['/api/emails', activeFolder], context.previousEmails);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === '1' && selectedEmailId) {
        const email = filteredEmails.find(e => e.id === selectedEmailId);
        if (email) {
          const hasRsTag = email.labels.includes('RS-TAG');
          
          labelMutation.mutate({ 
            id: selectedEmailId, 
            label: 'RS-TAG', 
            add: !hasRsTag 
          });
          toast({
            title: hasRsTag ? 'Removed Tag' : 'Tagged Email',
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedEmailId, filteredEmails]);

  // Infinite scroll - load more at 80% scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.8 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const downloadAttachment = async (emailId: string, attachmentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/emails/${emailId}/attachments/${attachmentId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Failed to download attachment",
        variant: "destructive",
      });
    }
  };

  // Process inline images when email changes
  useEffect(() => {
    const processInlineImages = async () => {
      if (!selectedEmail?.bodyHtml) {
        setProcessedEmailHtml('');
        return;
      }

      const inlineImages = selectedEmail.attachments.filter(att => att.contentId);
      
      if (inlineImages.length === 0) {
        setProcessedEmailHtml(selectedEmail.bodyHtml);
        return;
      }

      let processedHtml = selectedEmail.bodyHtml;

      for (const image of inlineImages) {
        try {
          const response = await fetch(`/api/emails/${selectedEmail.id}/attachments/${image.attachmentId}`);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // Replace cid: references with data URL
          const cidPattern = new RegExp(`cid:${image.contentId?.replace(/[<>]/g, '')}`, 'gi');
          processedHtml = processedHtml.replace(cidPattern, base64);
        } catch (error) {
          console.error('Failed to load inline image:', image.filename, error);
        }
      }

      setProcessedEmailHtml(processedHtml);
    };

    processInlineImages();
  }, [selectedEmail]);

  return (
    <div className="h-full flex" data-testid="page-emails">
      {/* Left Sidebar - Folders */}
      <div className="w-[20%] border-r flex flex-col bg-muted/10">
        <div className="p-4 border-b space-y-2">
          <Button 
            onClick={handleCompose} 
            className="w-full" 
            data-testid="button-compose"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Compose
          </Button>
          <Button 
            onClick={handleCheckMail} 
            variant="outline"
            className="w-full" 
            data-testid="button-check-mail"
          >
            <Mail className="mr-2 h-4 w-4" />
            Check Mail
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

      {/* Right Section - Email List (Top) and Reading Pane (Bottom) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Email List - Top 40% */}
        <div className="h-[40%] border-b flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={filterUnread ? "default" : "outline"}
                  onClick={() => setFilterUnread(!filterUnread)}
                  data-testid="filter-unread"
                >
                  Unread
                </Button>
                <div className="h-6 w-px bg-border" />
                <Button
                  size="sm"
                  variant={filterImportant ? "default" : "outline"}
                  onClick={() => setFilterImportant(!filterImportant)}
                  data-testid="filter-tags"
                >
                  Tags
                </Button>
                <div className="h-6 w-px bg-border" />
                <Button
                  size="sm"
                  variant={filterAttachments ? "default" : "outline"}
                  onClick={() => setFilterAttachments(!filterAttachments)}
                  data-testid="filter-attachments"
                >
                  Attachments
                </Button>
              </div>
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
                {filteredEmails.map((email) => {
                  const hasRsTag = email.labels.includes('RS-TAG');
                  return (
                  <div
                    key={email.id}
                    className={`px-3 py-1 grid grid-cols-12 gap-2 cursor-pointer hover-elevate ${
                      selectedEmailId === email.id ? 'bg-muted' : ''
                    } ${email.isUnread ? 'font-semibold' : ''} ${
                      hasRsTag ? 'bg-red-50 dark:bg-red-950/20' : ''
                    }`}
                    onClick={() => handleEmailClick(email)}
                    data-testid={`email-row-${email.id}`}
                  >
                    <div className="col-span-1 flex items-start gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const hasRsTag = email.labels.includes('RS-TAG');
                          labelMutation.mutate({ 
                            id: email.id, 
                            label: 'RS-TAG', 
                            add: !hasRsTag 
                          });
                          toast({
                            title: hasRsTag ? 'Removed Tag' : 'Tagged Email',
                          });
                        }}
                        data-testid={`tag-${email.id}`}
                      >
                        <Tag
                          className={`h-4 w-4 ${
                            email.labels.includes('RS-TAG') ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="col-span-4 truncate text-sm">
                      {email.from}
                    </div>
                    <div className="col-span-5 truncate text-sm">
                      {email.subject || '(no subject)'}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground text-right">
                      {new Date(email.date).toLocaleString('en-GB', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </div>
                  </div>
                  );
                })}
                
                {/* Infinite scroll observer */}
                <div ref={observerTarget} className="h-4" />
                
                {/* Loading indicator for next page */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Reading Pane - Bottom 60% */}
        <div className="h-[60%] flex flex-col overflow-hidden">
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
              <div className="py-1 px-4 border-b space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold flex-1" data-testid="email-subject">
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
                      {new Date(selectedEmail.date).toLocaleString('en-GB', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
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
                {(() => {
                  const fileAttachments = selectedEmail.attachments.filter(att => !att.contentId);
                  return fileAttachments.length > 0 && (
                    <div className="mb-4 p-2 border rounded-md bg-muted/30">
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover-elevate rounded px-2 py-1"
                        onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
                      >
                        <div className="text-sm font-medium">
                          Attachments ({fileAttachments.length})
                        </div>
                        {attachmentsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                      {attachmentsExpanded && (
                        <div className="flex flex-wrap gap-2 mt-2 px-2">
                          {fileAttachments.map((attachment, index) => (
                            <button
                              key={index}
                              onClick={() => downloadAttachment(selectedEmail.id, attachment.attachmentId, attachment.filename)}
                              className="text-sm text-primary hover:underline cursor-pointer px-2 py-1 border rounded bg-background"
                              data-testid={`attachment-${index}`}
                            >
                              {attachment.filename} ({Math.round(attachment.size / 1024)} KB)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  data-testid="email-body"
                >
                  {selectedEmail.bodyHtml ? (
                    <iframe
                      srcDoc={(processedEmailHtml || selectedEmail.bodyHtml).replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')}
                      className="w-full min-h-[400px] border-0"
                      sandbox="allow-same-origin allow-popups"
                      title="Email content"
                    />
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
