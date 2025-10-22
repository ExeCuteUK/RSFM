import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Eye, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { format, parse } from 'date-fns';

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
  matchedSupplierName?: string;
}

interface InvoiceAnalysis {
  isCreditNote: boolean;
  extractedData: {
    jobReferences: string[];
    containerNumbers: string[];
    truckNumbers: string[];
    customerReferences: string[];
    companyNames: string[];
    supplierName?: string;
    customerName?: string;
    weights: string[];
    amounts: {
      netTotal?: string;
      vat?: string;
      grossTotal?: string;
      allAmounts: string[];
    };
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
  const { openWindow } = useWindowManager();

  // Format date as DD/MM/YY
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    // Try to parse the date string
    const formats = [
      /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
      /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/,    // DD-MM-YYYY
      /(\d{4})-(\d{2})-(\d{2})/,    // YYYY-MM-DD
    ];
    
    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        let day, month, year;
        if (format === formats[3]) {
          // YYYY-MM-DD format
          year = match[1];
          month = match[2];
          day = match[3];
        } else {
          // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY formats
          day = match[1];
          month = match[2];
          year = match[3];
        }
        // Return DD/MM/YY (last 2 digits of year)
        return `${day}/${month}/${year.slice(-2)}`;
      }
    }
    
    return dateString; // Return as-is if no format matches
  };

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
      setLocation(`/import-shipments?search=${match.jobRef}`);
    } else if (match.jobType === 'export') {
      setLocation(`/export-shipments?search=${match.jobRef}`);
    } else {
      setLocation(`/custom-clearances?search=${match.jobRef}`);
    }
  };

  const addToJobFile = (match: InvoiceMatch) => {
    if (!analysis) return;

    // Parse extracted date with common formats
    const parseExtractedDate = (dateStr: string): string => {
      if (!dateStr) return '';
      
      try {
        // Try common date formats
        const formats = [
          'dd/MM/yyyy',
          'dd/MM/yy',
          'dd-MM-yyyy',
          'dd-MM-yy',
          'yyyy-MM-dd',
          'MM/dd/yyyy',
          'MM/dd/yy'
        ];
        
        for (const fmt of formats) {
          try {
            const parsed = parse(dateStr, fmt, new Date());
            if (!isNaN(parsed.getTime())) {
              return format(parsed, 'yyyy-MM-dd');
            }
          } catch {}
        }
        
        // Fallback to standard Date parsing
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        }
      } catch {}
      
      return '';
    };

    // Prepare initial data for the expense invoice window
    const initialData = {
      jobRef: match.jobRef.toString(),
      companyName: match.matchedSupplierName || analysis.extractedData.supplierName || '',
      invoiceNumber: analysis.extractedData.invoiceNumbers[0] || '',
      invoiceDate: parseExtractedDate(analysis.extractedData.dates[0] || ''),
      invoiceAmount: analysis.extractedData.amounts.netTotal 
        ? analysis.extractedData.amounts.netTotal.replace(/[^0-9.\-]/g, '') // Keep minus sign for credit notes
        : ''
    };

    // Open the expense invoice window with pre-populated data
    openWindow({
      id: `expense-invoice-${Date.now()}`,
      type: 'expense-invoice',
      title: 'Add Batch Invoices / Credits',
      payload: { initialData }
    });
  };


  return (
    <Card className={className} data-testid="invoice-matching-assistant">
      <CardHeader>
        <CardTitle className="text-base">Invoice Matching Assistant</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Supported: Zim, MSC, Maersk, PSG, GLB, Atanak, Transmec, Gondrand
        </p>
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
                      <span className="font-semibold text-sm">
                        Job #{match.jobRef}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigateToJob(match)}
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-job-${match.jobRef}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Job
                        </Button>
                        <Button
                          onClick={() => addToJobFile(match)}
                          variant="outline"
                          size="sm"
                          data-testid={`button-add-to-job-file-${match.jobRef}`}
                        >
                          <FilePlus className="h-3 w-3 mr-1" />
                          Add to Job File
                        </Button>
                      </div>
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

                    {/* Invoice Metadata */}
                    <div className="pt-2 mt-2 border-t text-xs space-y-1">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {(match.matchedSupplierName || analysis.extractedData.supplierName) && (
                          <div>
                            <span className="text-muted-foreground">Invoice From:</span>{' '}
                            <span className="font-medium">
                              {match.matchedSupplierName || analysis.extractedData.supplierName}
                            </span>
                          </div>
                        )}
                        {analysis.extractedData.invoiceNumbers.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Invoice No:</span>{' '}
                            <span className="font-medium">{analysis.extractedData.invoiceNumbers[0]}</span>
                          </div>
                        )}
                        {analysis.extractedData.dates.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Invoice Date:</span>{' '}
                            <span className="font-medium">{formatDate(analysis.extractedData.dates[0])}</span>
                          </div>
                        )}
                        {analysis.extractedData.amounts.netTotal && (
                          <div>
                            <span className="text-muted-foreground">Net Amount:</span>{' '}
                            <span className="font-medium">£{analysis.extractedData.amounts.netTotal}</span>
                          </div>
                        )}
                      </div>
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
