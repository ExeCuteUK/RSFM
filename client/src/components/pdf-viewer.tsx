import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ExternalLink, Printer, Download, Mail } from 'lucide-react'
import { useEmail } from '@/contexts/EmailContext'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  url: string
  filename?: string
  onClose?: () => void
}

export function PDFViewer({ url, filename, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const { openEmailComposer } = useEmail()

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

  function handleEmail() {
    // Open the DraggableEmailComposer with the PDF attached
    openEmailComposer({
      id: `email-${Date.now()}`,
      to: '',
      cc: '',
      bcc: '',
      subject: `Document: ${filename || 'PDF'}`,
      body: '',
      attachments: [{
        url: url,
        name: filename || 'document.pdf'
      }],
      metadata: {
        source: 'pdf-viewer'
      }
    })
    // Close the PDF viewer after opening email composer
    if (onClose) {
      onClose()
    }
  }

  return (
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
  )
}
