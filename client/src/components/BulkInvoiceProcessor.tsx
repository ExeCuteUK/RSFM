import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface BulkInvoiceLineItem {
  jobRef: string;
  description: string;
  amount: string;
  ourRef?: string;
  jobExists: boolean;
  jobType: 'import' | 'export' | 'clearance' | null;
  jobRefNumber: number;
  isPartialRef?: boolean;
}

interface BulkInvoiceHeader {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: string | null;
}

interface BulkInvoiceResult {
  success: boolean;
  filename: string;
  header: BulkInvoiceHeader;
  lineItems: BulkInvoiceLineItem[];
  rawText: string;
}

export interface BatchInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  lineItems: Array<{
    jobRef: string;
    description: string;
    amount: string;
  }>;
}

interface BulkInvoiceProcessorProps {
  className?: string;
  onAddToBatchForm?: (data: BatchInvoiceData) => void;
}

export function BulkInvoiceProcessor({ className, onAddToBatchForm }: BulkInvoiceProcessorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkInvoiceResult | null>(null);
  const [filename, setFilename] = useState<string>('');
  const { toast } = useToast();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFilename(file.name);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr/process-bulk-invoice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process bulk invoice');
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: 'Bulk Invoice Processed',
        description: `Extracted ${data.lineItems.length} line items from ${file.name}`,
      });
    } catch (error) {
      console.error('Error processing invoice:', error);
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process bulk invoice',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const addToJob = (lineItem: BulkInvoiceLineItem) => {
    if (!result || !onAddToBatchForm) return;

    // Open batch invoice form with this single line item
    const batchData: BatchInvoiceData = {
      invoiceNumber: result.header.invoiceNumber || '',
      invoiceDate: result.header.invoiceDate || '',
      supplier: result.header.supplier || '',
      lineItems: [{
        jobRef: lineItem.jobRef,
        description: lineItem.description,
        amount: lineItem.amount,
      }],
    };

    onAddToBatchForm(batchData);
  };

  const addAllToJobs = () => {
    if (!result || !onAddToBatchForm) return;

    // Open batch invoice form with ALL line items (regardless of job validation status)
    const batchData: BatchInvoiceData = {
      invoiceNumber: result.header.invoiceNumber || '',
      invoiceDate: result.header.invoiceDate || '',
      supplier: result.header.supplier || '',
      lineItems: result.lineItems.map(item => ({
        jobRef: item.jobRef,
        description: item.description,
        amount: item.amount,
      })),
    };

    onAddToBatchForm(batchData);
  };

  return (
    <Card className={className} data-testid="card-bulk-invoice-processor">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FilePlus className="h-5 w-5" />
          Bulk Invoice Processor (GLB Customs)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag & Drop Zone */}
        {!result && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover-elevate cursor-pointer'}
            `}
            data-testid="dropzone-bulk-invoice"
          >
            <input
              type="file"
              id="bulk-invoice-upload"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
              data-testid="input-bulk-invoice-file"
            />
            <label
              htmlFor="bulk-invoice-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Processing {filename}...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Drop GLB Customs invoice here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to select a file
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, PNG, JPG, and other image formats
                  </p>
                </>
              )}
            </label>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{filename}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice No:</span>
                  <p className="font-medium" data-testid="text-invoice-number">
                    {result.header.invoiceNumber || 'Not detected'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium" data-testid="text-invoice-date">
                    {result.header.invoiceDate || 'Not detected'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium" data-testid="text-supplier">
                    {result.header.supplier || 'Not detected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium">
                    Line Items ({result.lineItems.length})
                  </h3>
                  {result.lineItems.some(item => item.isPartialRef) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      {result.lineItems.filter(item => item.isPartialRef).length} partial reference{result.lineItems.filter(item => item.isPartialRef).length > 1 ? 's' : ''} detected - review before saving
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={addAllToJobs}
                  data-testid="button-add-all"
                >
                  <FilePlus className="h-3 w-3 mr-1" />
                  Add All to Batch Form
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Ref</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.lineItems.map((item, index) => (
                      <TableRow key={index} data-testid={`row-line-item-${index}`}>
                        <TableCell className="font-medium" data-testid={`text-job-ref-${index}`}>
                          <div className="flex items-center gap-1.5">
                            {item.jobRef}
                            {item.isPartialRef && (
                              <Badge variant="outline" className="text-xs gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Partial
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-description-${index}`}>
                          {item.description}
                        </TableCell>
                        <TableCell data-testid={`text-amount-${index}`}>
                          £{item.amount}
                        </TableCell>
                        <TableCell data-testid={`status-job-${index}`}>
                          {item.jobExists ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Job Found
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Not Found
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addToJob(item)}
                            data-testid={`button-add-to-job-${index}`}
                          >
                            Add to Batch Form
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setFilename('');
              }}
              className="w-full"
              data-testid="button-process-another"
            >
              Process Another Invoice
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
