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

interface BulkInvoiceProcessorProps {
  className?: string;
}

export function BulkInvoiceProcessor({ className }: BulkInvoiceProcessorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkInvoiceResult | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFilename(file.name);
    setResult(null);
    setUploadedFile(file);

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
      setUploadedFile(null);
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

  const addToJob = async (lineItem: BulkInvoiceLineItem, index: number) => {
    if (!result || !lineItem.jobExists || !uploadedFile) return;

    setAddingItems(prev => new Set(prev).add(index));

    try {
      console.log(`Processing single job ${lineItem.jobRef} (${lineItem.jobRefNumber})...`);
      
      // Step 1: Upload the invoice file to Google Drive with job context
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('jobType', lineItem.jobType === 'import' ? 'Import Shipments' : 
                                  lineItem.jobType === 'export' ? 'Export Shipments' : 
                                  'Custom Clearances');
      formData.append('jobRef', lineItem.jobRefNumber.toString());
      formData.append('documentType', 'Clearance Documents');

      const uploadResponse = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`Upload failed for job ${lineItem.jobRef}:`, errorText);
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log(`Upload successful for job ${lineItem.jobRef}:`, uploadResult);

      // Step 2: Get existing job file group documents (handle 404 as empty array)
      const fileGroupResponse = await fetch(`/api/job-file-groups/${lineItem.jobRefNumber}`, {
        credentials: 'include',
      });

      let documents: Array<{filename: string; path: string}> = [];
      
      if (fileGroupResponse.ok) {
        const fileGroup = await fileGroupResponse.json();
        documents = fileGroup.documents || [];
        console.log(`Found ${documents.length} existing documents for job ${lineItem.jobRef}`);
      } else if (fileGroupResponse.status === 404) {
        // File group doesn't exist yet, start with empty array
        console.log(`No existing file group for job ${lineItem.jobRef}, will create new one`);
        documents = [];
      } else {
        const errorText = await fileGroupResponse.text();
        console.error(`Failed to fetch file group for job ${lineItem.jobRef}:`, errorText);
        throw new Error(`Failed to fetch file group: ${errorText}`);
      }

      // Add the new invoice to the documents array
      documents.push({
        filename: uploadResult.filename,
        path: uploadResult.objectPath,
      });

      // Step 3: Update the job file group with the new document (will create if it doesn't exist)
      // Note: apiRequest throws on error, so if we reach here it succeeded
      await apiRequest('PATCH', `/api/job-file-groups/${lineItem.jobRefNumber}/documents`, {
        documents,
      });

      console.log(`Successfully added invoice to job ${lineItem.jobRef}`);
      
      toast({
        title: 'Invoice Added',
        description: `Successfully added invoice to Job ${lineItem.jobRef}`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/job-file-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/job-file-groups', lineItem.jobRefNumber] });
    } catch (error) {
      console.error(`Error adding invoice to job ${lineItem.jobRef}:`, error);
      toast({
        title: 'Failed to Add',
        description: error instanceof Error ? error.message : 'Failed to add invoice to job',
        variant: 'destructive',
      });
    } finally {
      setAddingItems(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const addAllToJobs = async () => {
    if (!result || !uploadedFile) return;

    const validItems = result.lineItems.filter(item => item.jobExists);
    if (validItems.length === 0) {
      toast({
        title: 'No Valid Items',
        description: 'No line items with valid job references found',
        variant: 'destructive',
      });
      return;
    }

    setAddingAll(true);

    try {
      let successCount = 0;
      let failedCount = 0;

      // Process all valid items
      for (const item of validItems) {
        try {
          console.log(`Processing job ${item.jobRef} (${item.jobRefNumber})...`);
          
          // Create a NEW FormData instance for each iteration to avoid field duplication
          const formData = new FormData();
          formData.append('file', uploadedFile);
          formData.append('jobType', item.jobType === 'import' ? 'Import Shipments' : 
                                      item.jobType === 'export' ? 'Export Shipments' : 
                                      'Custom Clearances');
          formData.append('jobRef', item.jobRefNumber.toString());
          formData.append('documentType', 'Clearance Documents');

          const uploadResponse = await fetch('/api/drive/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`Upload failed for job ${item.jobRef}:`, errorText);
            throw new Error(`Upload failed: ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log(`Upload successful for job ${item.jobRef}:`, uploadResult);

          // Get existing job file group documents (handle 404 as empty array)
          const fileGroupResponse = await fetch(`/api/job-file-groups/${item.jobRefNumber}`, {
            credentials: 'include',
          });

          let documents: Array<{filename: string; path: string}> = [];
          
          if (fileGroupResponse.ok) {
            const fileGroup = await fileGroupResponse.json();
            documents = fileGroup.documents || [];
            console.log(`Found ${documents.length} existing documents for job ${item.jobRef}`);
          } else if (fileGroupResponse.status === 404) {
            // File group doesn't exist yet, start with empty array
            console.log(`No existing file group for job ${item.jobRef}, will create new one`);
            documents = [];
          } else {
            throw new Error(`Failed to fetch file group: ${fileGroupResponse.statusText}`);
          }

          // Add the new invoice to documents array
          documents.push({
            filename: uploadResult.filename,
            path: uploadResult.objectPath,
          });

          // Update the job file group (will create if it doesn't exist)
          // Note: apiRequest throws on error, so if we reach here it succeeded
          await apiRequest('PATCH', `/api/job-file-groups/${item.jobRefNumber}/documents`, {
            documents,
          });

          console.log(`Successfully added invoice to job ${item.jobRef}`);
          successCount++;
          
          // Invalidate cache for this specific job
          queryClient.invalidateQueries({ queryKey: ['/api/job-file-groups', item.jobRefNumber] });
        } catch (itemError) {
          console.error(`Error adding invoice to job ${item.jobRef}:`, itemError);
          failedCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Invoices Added',
          description: `Successfully added invoice to ${successCount} job(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
      } else {
        toast({
          title: 'Failed to Add Invoices',
          description: 'Could not add invoices to any jobs',
          variant: 'destructive',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/job-file-groups'] });
    } catch (error) {
      console.error('Error adding all:', error);
      toast({
        title: 'Failed to Add All',
        description: error instanceof Error ? error.message : 'Failed to add invoices to jobs',
        variant: 'destructive',
      });
    } finally {
      setAddingAll(false);
    }
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
                <h3 className="font-medium">
                  Line Items ({result.lineItems.length})
                </h3>
                {result.lineItems.some(item => item.jobExists) && (
                  <Button
                    size="sm"
                    onClick={addAllToJobs}
                    disabled={addingAll}
                    data-testid="button-add-all"
                  >
                    {addingAll ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Adding All...
                      </>
                    ) : (
                      <>
                        <FilePlus className="h-3 w-3 mr-1" />
                        Add All to Jobs
                      </>
                    )}
                  </Button>
                )}
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
                          {item.jobRef}
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
                            onClick={() => addToJob(item, index)}
                            disabled={!item.jobExists || addingItems.has(index)}
                            data-testid={`button-add-to-job-${index}`}
                          >
                            {addingItems.has(index) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Add to Job'
                            )}
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
                setUploadedFile(null);
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
