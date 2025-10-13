import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { DraggableWindow } from "./DraggableWindow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Send, Loader2, Paperclip } from "lucide-react";

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

// Helper function to convert plain text to safe HTML
const textToHtml = (text: string): string => {
  if (!text) return '';
  // Escape HTML special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  // Convert newlines to <br> tags
  return escaped.replace(/\n/g, '<br>');
};

export function EmailComposer({ isOpen, onClose, mode = 'compose', originalEmail }: EmailComposerProps) {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [signatureAdded, setSignatureAdded] = useState(false);
  
  const [toSuggestions, setToSuggestions] = useState<EmailContact[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [toInputValue, setToInputValue] = useState("");
  
  const saveTimerRef = useRef<NodeJS.Timeout>();

  // Fetch current user's Gmail email and signature
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // Fetch email signature (always fetch, but only apply if user wants to use it)
  const { data: signatureData, isLoading: isLoadingSignature } = useQuery({
    queryKey: ['/api/settings/email-signature'],
  });

  // Pre-fill for replies and forwards
  useEffect(() => {
    if (originalEmail) {
      const quotedContent = originalEmail.bodyHtml || textToHtml(originalEmail.bodyText || '');
      const signature = signatureData?.signature || '';
      
      if (mode === 'reply') {
        setTo(originalEmail.from);
        setSubject(originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`);
        const quotedBody = `<p><br></p><p><br></p>${signature}<hr><p><em>On ${new Date(originalEmail.date).toLocaleString()}, ${originalEmail.from} wrote:</em></p><blockquote>${quotedContent}</blockquote>`;
        setBody(quotedBody);
        setSignatureAdded(true);
      } else if (mode === 'replyAll') {
        setTo(originalEmail.from);
        setCc(originalEmail.cc?.join(', ') || '');
        setSubject(originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`);
        const quotedBody = `<p><br></p><p><br></p>${signature}<hr><p><em>On ${new Date(originalEmail.date).toLocaleString()}, ${originalEmail.from} wrote:</em></p><blockquote>${quotedContent}</blockquote>`;
        setBody(quotedBody);
        setSignatureAdded(true);
      } else if (mode === 'forward') {
        setSubject(originalEmail.subject.startsWith('Fwd:') ? originalEmail.subject : `Fwd: ${originalEmail.subject}`);
        const quotedBody = `<p><br></p><p><br></p>${signature}<hr><p><em>Forwarded message from ${originalEmail.from} on ${new Date(originalEmail.date).toLocaleString()}:</em></p><blockquote>${quotedContent}</blockquote>`;
        setBody(quotedBody);
        setSignatureAdded(true);
      }
    } else if (mode === 'compose' && !signatureAdded && signatureData?.signature && userData?.user?.useSignature) {
      // For new emails, add signature at the end (only once, and only if user wants to use signature)
      setBody(`<p><br></p><p><br></p>${signatureData.signature}`);
      setSignatureAdded(true);
    } else if (mode === 'compose' && !signatureAdded && !signatureData?.signature && !isLoadingSignature && userData?.user?.useSignature) {
      // Mark as added even if there's no signature to prevent infinite loops
      setSignatureAdded(true);
    }
  }, [originalEmail, mode, signatureData, signatureAdded, userData, isLoadingSignature]);

  // Reset state when composer closes
  useEffect(() => {
    if (!isOpen) {
      setSignatureAdded(false);
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setBody("");
      setDraftId(null);
    }
  }, [isOpen]);

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
    if (!to || !subject) return null;

    setIsSaving(true);
    try {
      const response = await apiRequest("POST", "/api/emails/drafts", {
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        body,
        draftId,
      });
      
      const result = await response.json();
      
      if (result.id && !draftId) {
        setDraftId(result.id);
      }
      
      setLastSaved(new Date());
      return result.id;
    } catch (error) {
      console.error("Failed to save draft:", error);
      return null;
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
        const newDraftId = await saveDraft();
        if (newDraftId) {
          return await apiRequest("POST", `/api/emails/drafts/${newDraftId}/send`, { recipients });
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
    setLastSaved(null);
    setToInputValue("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const title = mode === 'compose' ? 'New Email' :
    mode === 'reply' ? 'Reply' :
    mode === 'replyAll' ? 'Reply All' :
    'Forward';

  // Prevent arrow key events from propagating to background email list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation();
    }
  };

  return (
    <DraggableWindow
      id="email-composer"
      title={title}
      width={900}
      height={650}
      onClose={handleClose}
    >
      <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
        {/* Top Action Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
          <Button
            size="sm"
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
          <Button
            size="sm"
            variant="outline"
            data-testid="button-attach"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Attach
          </Button>
          
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
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
        </div>

        {/* Email Fields */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 space-y-2 flex-shrink-0">
            {/* From field */}
            <div className="flex items-center gap-3">
              <Label className="w-16 text-right text-sm">From:</Label>
              <Input
                value={userData?.user?.gmailEmail || 'Loading...'}
                disabled
                className="flex-1 h-8 text-sm"
                data-testid="input-from"
              />
            </div>

            {/* To field */}
            <div className="flex items-center gap-3">
              <Label htmlFor="to" className="w-16 text-right text-sm">To:</Label>
              <div className="flex-1 relative">
                <Input
                  id="to"
                  data-testid="input-to"
                  value={toInputValue || to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    handleToInputChange(e.target.value);
                  }}
                  placeholder="recipient@example.com"
                  className="w-full h-8 text-sm"
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
            </div>

            {/* Cc and Bcc fields - Always visible, side by side */}
            <div className="flex items-center gap-3">
              <Label htmlFor="cc" className="w-16 text-right text-sm">Cc:</Label>
              <Input
                id="cc"
                data-testid="input-cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 h-8 text-sm"
              />
              <Label htmlFor="bcc" className="w-16 text-right text-sm">Bcc:</Label>
              <Input
                id="bcc"
                data-testid="input-bcc"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1 h-8 text-sm"
              />
            </div>

            {/* Subject field */}
            <div className="flex items-center gap-3">
              <Label htmlFor="subject" className="w-16 text-right text-sm">Subject:</Label>
              <Input
                id="subject"
                data-testid="input-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="flex-1 h-8 text-sm"
              />
            </div>
          </div>

          {/* Message Body with Rich Text Editor */}
          <div className="flex-1 react-quill-wrapper">
            <ReactQuill
              value={body}
              onChange={setBody}
              placeholder="Write your message..."
              theme="snow"
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'indent': '-1'}, { 'indent': '+1' }],
                  [{ 'align': [] }],
                  ['link'],
                  [{ 'color': [] }, { 'background': [] }],
                  ['clean']
                ]
              }}
              formats={[
                'header',
                'bold', 'italic', 'underline', 'strike',
                'list', 'bullet', 'indent',
                'align',
                'link', 'image',
                'color', 'background',
                'blockquote',
                'table', 'td', 'tr', 'th', 'tbody', 'thead'
              ]}
            />
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
}
