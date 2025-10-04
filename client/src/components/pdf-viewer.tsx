import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ExternalLink, Printer, Download, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  url: string
  filename?: string
}

export function PDFViewer({ url, filename }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState(`Document: ${filename || 'PDF'}`)
  const [emailBody, setEmailBody] = useState('')
  const { toast } = useToast()

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset)
  }

  function previousPage() {
    changePage(-1)
  }

  function nextPage() {
    changePage(1)
  }

  function handlePrint() {
    window.open(url, '_blank')?.print()
  }

  function handleDownload() {
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'document.pdf'
    link.click()
  }

  const sendEmail = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/gmail/send', {
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
        attachmentUrl: url,
        attachmentFilename: filename || 'document.pdf'
      })
    },
    onSuccess: () => {
      toast({
        title: 'Email sent',
        description: 'Your email has been sent successfully with the PDF attached.'
      })
      setEmailDialogOpen(false)
      setEmailTo('')
      setEmailBody('')
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send email',
        description: error.message || 'Please check your Gmail connection in Settings.',
        variant: 'destructive'
      })
    }
  })

  function handleEmail() {
    setEmailDialogOpen(true)
  }

  return (
    <>
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email with Attachment</DialogTitle>
            <DialogDescription>
              Send this PDF as an email attachment via Gmail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                data-testid="input-email-to"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Message (optional)</Label>
              <Textarea
                id="email-body"
                placeholder="Add a message..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                data-testid="textarea-email-body"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendEmail.isPending}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendEmail.mutate()}
              disabled={!emailTo || sendEmail.isPending}
              data-testid="button-send-email"
            >
              {sendEmail.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={previousPage}
            disabled={pageNumber <= 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={nextPage}
            disabled={!numPages || pageNumber >= numPages}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(scale - 0.1)}
            disabled={scale <= 0.5}
            data-testid="button-zoom-out"
          >
            -
          </Button>
          <span className="text-sm min-w-[4rem] text-center">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(scale + 0.1)}
            disabled={scale >= 2.0}
            data-testid="button-zoom-in"
          >
            +
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(url, '_blank')}
            data-testid="button-open-new-tab"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in New Tab
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            data-testid="button-print"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            data-testid="button-download"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleEmail}
            data-testid="button-email"
          >
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
        </div>
        </div>
        <div className="flex-1 overflow-auto flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full">
              <p className="text-destructive">Failed to load PDF</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
        </div>
      </div>
    </>
  )
}
