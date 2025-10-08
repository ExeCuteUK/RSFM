import PDFDocument from 'pdfkit';
import type { Invoice } from '@shared/schema';
import path from 'path';
import fs from 'fs';

interface GeneratePDFOptions {
  invoice: Invoice;
}

export async function generateInvoicePDF({ invoice }: GeneratePDFOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const logoPath = path.join(process.cwd(), 'attached_assets', 'rs-logo.jpg');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 40, { width: 80 });
        } catch (e) {
          console.error('Error loading logo:', e);
        }
      }

      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('R.S INTERNATIONAL', 150, 50, { align: 'left' });
      
      doc.fontSize(9)
         .font('Helvetica')
         .text('Unit 7 Telford Way', 150, 75)
         .text('Peterborough, PE2 7UH', 150, 87)
         .text('Tel: 01733 394242', 150, 99)
         .text('Email: info@rsinternational.co.uk', 150, 111);

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#003366')
         .text('INVOICE', 400, 60);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000')
         .text(`Invoice No: ${invoice.invoiceNumber}`, 400, 95)
         .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}`, 400, 110)
         .text(`Job Ref: ${invoice.jobRef}`, 400, 125);

      doc.moveTo(50, 145)
         .lineTo(545, 145)
         .stroke();

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('INVOICE TO:', 50, 160);

      doc.fontSize(10)
         .font('Helvetica');
      
      if (invoice.customerCompanyName) {
        doc.text(invoice.customerCompanyName, 50, 180);
      }
      
      if (invoice.customerAddress) {
        const addressLines = invoice.customerAddress.split('\n');
        let yPos = 195;
        addressLines.forEach(line => {
          doc.text(line.trim(), 50, yPos);
          yPos += 12;
        });
      }

      if (invoice.shipmentDetails) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('SHIPMENT DETAILS:', 300, 160);

        doc.fontSize(9)
           .font('Helvetica')
           .text(invoice.shipmentDetails, 300, 180, { width: 240 });
      }

      const tableTop = 280;
      doc.moveTo(50, tableTop)
         .lineTo(545, tableTop)
         .stroke();

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Description', 55, tableTop + 8)
         .text('Amount', 460, tableTop + 8);

      doc.moveTo(50, tableTop + 25)
         .lineTo(545, tableTop + 25)
         .stroke();

      let yPosition = tableTop + 35;
      doc.font('Helvetica');

      const lineItems = invoice.lineItems || [];
      lineItems.forEach((item: any) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(9)
           .text(item.description, 55, yPosition, { width: 390 })
           .text(`£${parseFloat(item.amount || '0').toFixed(2)}`, 460, yPosition);

        yPosition += 20;
      });

      yPosition += 10;
      doc.moveTo(50, yPosition)
         .lineTo(545, yPosition)
         .stroke();

      yPosition += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Subtotal:', 400, yPosition)
         .text(`£${invoice.subtotal.toFixed(2)}`, 485, yPosition);

      yPosition += 18;
      const vatLabel = invoice.vatRate === '20' ? 'VAT (20%)' : 
                       invoice.vatRate === '0' ? 'VAT (0%)' : 'VAT (Exempt)';
      doc.text(`${vatLabel}:`, 400, yPosition)
         .text(`£${invoice.vat.toFixed(2)}`, 485, yPosition);

      yPosition += 18;
      doc.moveTo(400, yPosition)
         .lineTo(545, yPosition)
         .stroke();

      yPosition += 10;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Total:', 400, yPosition)
         .text(`£${invoice.total.toFixed(2)}`, 485, yPosition);

      yPosition += 40;
      if (yPosition > 680) {
        doc.addPage();
        yPosition = 50;
      }

      if (invoice.paymentTerms) {
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text('PAYMENT TERMS:', 50, yPosition);
        
        yPosition += 15;
        doc.fontSize(8)
           .font('Helvetica')
           .text(invoice.paymentTerms, 50, yPosition, { width: 495 });
        
        yPosition += 30;
      }

      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(7)
         .fillColor('#666666')
         .text('R.S International Ltd - Registered in England - Company No. 12345678', 50, yPosition, { align: 'center' })
         .text('VAT Registration No. GB123456789', 50, yPosition + 10, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
