import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Send, Loader2 } from "lucide-react";

interface EmailContact {
  id: string;
  email: string;
  name?: string;
  frequency: number;
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'compose' | 'reply' | 'replyAll' | 'forward';
  originalEmail?: {
    id: string;
    from: string;
    to: string[];
    cc?: string[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    date: string;
  };
}

export function EmailComposer({ isOpen, onClose, mode = 'compose', originalEmail }: EmailComposerProps) {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [toSuggestions, setToSuggestions] = useState<EmailContact[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [toInputValue, setToInputValue] = useState("");
  
  const saveTimerRef = useRef<NodeJS.Timeout>();

  // Pre-fill for replies and forwards
  useEffect(() => {
    if (originalEmail) {
      if (mode === 'reply') {
        setTo(originalEmail.from);
        setSubject(originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`);
        const quotedBody = `\n\n---\nOn ${new Date(originalEmail.date).toLocaleString()}, ${originalEmail.from} wrote:\n${originalEmail.bodyText || originalEmail.bodyHtml || ''}`;
        setBody(quotedBody);
      } else if (mode === 'replyAll') {
        setTo(originalEmail.from);
        setCc(originalEmail.cc?.join(', ') || '');
        setShowCc(true);
        setSubject(originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`);
        const quotedBody = `\n\n---\nOn ${new Date(originalEmail.date).toLocaleString()}, ${originalEmail.from} wrote:\n${originalEmail.bodyText || originalEmail.bodyHtml || ''}`;
        setBody(quotedBody);
      } else if (mode === 'forward') {
        setSubject(originalEmail.subject.startsWith('Fwd:') ? originalEmail.subject : `Fwd: ${originalEmail.subject}`);
        const quotedBody = `\n\n---\nForwarded message from ${originalEmail.from} on ${new Date(originalEmail.date).toLocaleString()}:\n${originalEmail.bodyText || originalEmail.bodyHtml || ''}`;
        setBody(quotedBody);
      }
    }
  }, [originalEmail, mode]);

  // Auto-save draft every 3 seconds
  useEffect(() => {
    if (!isOpen) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      if (to && subject) {
        saveDraft();
      }
    }, 3000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [to, cc, bcc, subject, body, isOpen]);

  const saveDraft = async () => {
    if (!to || !subject) return;

    setIsSaving(true);
    try {
      const result = await apiRequest("POST", "/api/emails/drafts", {
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        body,
        draftId,
      });
      
      if (result.id && !draftId) {
        setDraftId(result.id);
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!to || !subject) {
        throw new Error("To and Subject are required");
      }

      // Extract all recipient emails
      const recipients = [
        ...to.split(',').map(e => e.trim()),
        ...(cc ? cc.split(',').map(e => e.trim()) : []),
        ...(bcc ? bcc.split(',').map(e => e.trim()) : []),
      ].filter(e => e);

      if (draftId) {
        return await apiRequest("POST", `/api/emails/drafts/${draftId}/send`, { recipients });
      } else {
        await saveDraft();
        if (draftId) {
          return await apiRequest("POST", `/api/emails/drafts/${draftId}/send`, { recipients });
        }
        throw new Error("Failed to create draft");
      }
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch email contact suggestions
  const fetchContactSuggestions = async (query: string) => {
    if (!query.trim()) {
      setToSuggestions([]);
      return;
    }

    try {
      const contacts = await apiRequest("GET", `/api/email-contacts?query=${encodeURIComponent(query)}&limit=5`);
      setToSuggestions(contacts);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const handleToInputChange = (value: string) => {
    setToInputValue(value);
    const lastComma = value.lastIndexOf(',');
    const currentInput = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();
    
    if (currentInput.length > 0) {
      fetchContactSuggestions(currentInput);
      setShowToSuggestions(true);
    } else {
      setShowToSuggestions(false);
    }
  };

  const selectSuggestion = (contact: EmailContact) => {
    const lastComma = toInputValue.lastIndexOf(',');
    let newValue = '';
    
    if (lastComma >= 0) {
      newValue = toInputValue.substring(0, lastComma + 1) + ' ' + contact.email;
    } else {
      newValue = contact.email;
    }
    
    setTo(newValue);
    setToInputValue(newValue);
    setShowToSuggestions(false);
  };

  const resetForm = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setDraftId(null);
    setShowCc(false);
    setShowBcc(false);
    setLastSaved(null);
    setToInputValue("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col" data-testid="dialog-email-composer">
        <DialogHeader>
          <DialogTitle>
            {mode === 'compose' && 'New Email'}
            {mode === 'reply' && 'Reply'}
            {mode === 'replyAll' && 'Reply All'}
            {mode === 'forward' && 'Forward'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div>
            <Label htmlFor="to">To</Label>
            <div className="relative">
              <Input
                id="to"
                data-testid="input-to"
                value={toInputValue || to}
                onChange={(e) => {
                  setTo(e.target.value);
                  handleToInputChange(e.target.value);
                }}
                placeholder="recipient@example.com"
                className="w-full"
              />
              {showToSuggestions && toSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                  {toSuggestions.map((contact) => (
                    <div
                      key={contact.id}
                      data-testid={`suggestion-${contact.email}`}
                      className="px-3 py-2 hover-elevate cursor-pointer"
                      onClick={() => selectSuggestion(contact)}
                    >
                      <div className="font-medium">{contact.email}</div>
                      {contact.name && <div className="text-sm text-muted-foreground">{contact.name}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              {!showCc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCc(true)}
                  data-testid="button-show-cc"
                >
                  Cc
                </Button>
              )}
              {!showBcc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBcc(true)}
                  data-testid="button-show-bcc"
                >
                  Bcc
                </Button>
              )}
            </div>
          </div>

          {showCc && (
            <div>
              <Label htmlFor="cc">Cc</Label>
              <Input
                id="cc"
                data-testid="input-cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
              />
            </div>
          )}

          {showBcc && (
            <div>
              <Label htmlFor="bcc">Bcc</Label>
              <Input
                id="bcc"
                data-testid="input-bcc"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
              />
            </div>
          )}

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              data-testid="input-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              data-testid="textarea-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="min-h-[300px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {!isSaving && lastSaved && (
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!to || !subject || sendMutation.isPending}
              data-testid="button-send"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
