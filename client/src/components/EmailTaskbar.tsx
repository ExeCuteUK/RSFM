import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MinimizedEmail {
  id: string;
  to: string;
  subject: string;
}

interface EmailTaskbarProps {
  minimizedEmails: MinimizedEmail[];
  onRestore: (id: string) => void;
  onClose: (id: string) => void;
}

export function EmailTaskbar({ minimizedEmails, onRestore, onClose }: EmailTaskbarProps) {
  if (minimizedEmails.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-12 bg-background border-t border-border z-40 flex items-center gap-2 px-4"
      data-testid="email-taskbar"
    >
      {minimizedEmails.map((email) => (
        <div
          key={email.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md hover-elevate cursor-pointer max-w-xs"
          onClick={() => onRestore(email.id)}
          data-testid={`minimized-email-${email.id}`}
        >
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {email.subject || "New Email"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              To: {email.to || "No recipient"}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClose(email.id);
            }}
            data-testid={`button-close-minimized-${email.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
