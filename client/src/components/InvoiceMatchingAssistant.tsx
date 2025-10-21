import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface MatchedField {
  field: string;
  value: string;
  score: number;
}

interface InvoiceMatch {
  jobRef: number;
  jobType: 'import' | 'export' | 'clearance';
  confidence: number;
  matchedFields: MatchedField[];
  customerName?: string;
}

interface InvoiceAnalysis {
  isCreditNote: boolean;
  extractedData: {
    jobReferences: string[];
    containerNumbers: string[];
    truckNumbers: string[];
    customerReferences: string[];
    companyNames: string[];
    weights: string[];
    amounts: string[];
    invoiceNumbers: string[];
    dates: string[];
  };
  matches: InvoiceMatch[];
  rawText: string;
}

interface InvoiceMatchingAssistantProps {
  className?: string;
}

export function InvoiceMatchingAssistant({ className }: InvoiceMatchingAssistantProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<InvoiceAnalysis | null>(null);
  const [filename, setFilename] = useState<string>('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFilename(file.name);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr/match-invoice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process invoice');
      }

      const result = await response.json();
      setAnalysis(result.analysis);

      // Show toast if fallback OCR was used
      if (result.usedFallback) {
        toast({
          title: 'Enhanced Scanning Used',
          description: 'PDF converted to images for better text extraction.',
          variant: 'default',
        });
      }

      if (result.analysis.matches.length === 0) {
        toast({
          title: 'No Matches Found',
          description: 'Could not find any jobs matching this invoice. Try checking manually.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error processing invoice:', error);
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process invoice',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }, []);

  const navigateToJob = (match: InvoiceMatch) => {
    if (match.jobType === 'import') {
      setLocation(`/import-shipments?highlight=${match.jobRef}`);
    } else if (match.jobType === 'export') {
      setLocation(`/export-shipments?highlight=${match.jobRef}`);
    } else {
      setLocation(`/custom-clearances?highlight=${match.jobRef}`);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 50) {
      return <Badge className="bg-green-600 dark:bg-green-700">High Confidence</Badge>;
    } else if (confidence >= 25) {
      return <Badge className="bg-yellow-600 dark:bg-yellow-700">Possible Match</Badge>;
    } else {
      return <Badge className="bg-gray-600 dark:bg-gray-700">Low Confidence</Badge>;
    }
  };

  return (
    <Card className={className} data-testid="invoice-matching-assistant">
      <CardHeader>
        <CardTitle className="text-base">Invoice Matching Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        {!analysis && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-md p-6 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover-elevate'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
            `}
            data-testid="invoice-dropzone"
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="invoice-file-input"
              disabled={isProcessing}
            />
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Analyzing invoice...</p>
                <p className="text-xs text-muted-foreground mt-1">{filename}</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-foreground mb-1">
                  Drop invoice PDF or image here
                </p>
                <p className="text-xs text-muted-foreground">
                  Eric will scan it and suggest matching jobs
                </p>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-4">
            {/* Header with filename and credit note warning */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground truncate">{filename}</span>
              </div>
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setFilename('');
                }}
                variant="outline"
                size="sm"
                data-testid="button-analyze-another"
              >
                Analyze Another
              </Button>
            </div>

            {/* Credit Note Warning */}
            {analysis.isCreditNote && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                    Credit Note Detected
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    Remember to enter this as a negative amount
                  </p>
                </div>
              </div>
            )}

            {/* Matches */}
            {analysis.matches.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Found {analysis.matches.length} Potential Match{analysis.matches.length !== 1 ? 'es' : ''}
                </h4>
                {analysis.matches.map((match, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-md bg-card space-y-2"
                    data-testid={`match-result-${idx}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          Job #{match.jobRef}
                        </span>
                        {getConfidenceBadge(match.confidence)}
                      </div>
                      <Button
                        onClick={() => navigateToJob(match)}
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-job-${match.jobRef}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Job
                      </Button>
                    </div>

                    {match.customerName && (
                      <p className="text-sm text-muted-foreground">
                        {match.customerName}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {match.matchedFields.map((field, fieldIdx) => (
                        <div
                          key={fieldIdx}
                          className="flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 rounded"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="font-medium">{field.field}:</span>
                          <span>{field.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>No matching jobs found</p>
                <p className="text-xs mt-1">
                  The invoice might be for a job not yet in the system
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
