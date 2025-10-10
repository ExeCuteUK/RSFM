import { useState } from "react";
import { FileText, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface OCRDialogProps {
  filePath: string;
  fileName: string;
  trigger?: React.ReactNode;
}

export function OCRDialog({ filePath, fileName, trigger }: OCRDialogProps) {
  const [open, setOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleExtractText = async () => {
    setExtracting(true);
    setExtractedText("");
    setConfidence(0);

    try {
      const response = await fetch("/api/objects/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: filePath, filename: fileName }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to extract text");
      }

      const data = await response.json();
      setExtractedText(data.text || "No text found in document");
      setConfidence(data.confidence || 0);
      setOpen(true);
    } catch (error) {
      toast({
        title: "OCR Failed",
        description: "Could not extract text from this file. Please try a different file.",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={handleExtractText}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExtractText}
          disabled={extracting}
          title="Extract text with OCR"
          data-testid={`button-ocr-${fileName}`}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Sparkles className="h-3 w-3" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" aria-describedby="ocr-confidence-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Extracted Text from {fileName}
            </DialogTitle>
            <DialogDescription id="ocr-confidence-description">
              OCR Confidence: {Math.round(confidence)}%
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4">
            <div className="relative">
              <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap font-mono">
                {extractedText}
              </pre>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="absolute top-2 right-2"
                data-testid="button-copy-ocr-text"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
