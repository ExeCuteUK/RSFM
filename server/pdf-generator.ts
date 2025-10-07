import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
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
      let hasLogo = false;
      if (fs.existsSync(logoPath)) {
        hasLogo = true;
      }

      if (hasLogo) {
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
         .font('Helvetica')
         .text(invoice.customerName || '', 50, 180);
      
      if (invoice.customerAddress) {
        const addressLines = invoice.customerAddress.split('\n');
        let yPos = 195;
        addressLines.forEach(line => {
          doc.text(line.trim(), 50, yPos);
          yPos += 12;
        });
      }

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('SHIPMENT DETAILS:', 300, 160);

      doc.fontSize(10)
         .font('Helvetica');
      
      let detailsY = 180;
      if (invoice.shipmentReference) {
        doc.text(`Reference: ${invoice.shipmentReference}`, 300, detailsY);
        detailsY += 15;
      }
      if (invoice.containerNumber) {
        doc.text(`Container: ${invoice.containerNumber}`, 300, detailsY);
        detailsY += 15;
      }
      if (invoice.vesselName) {
        doc.text(`Vessel: ${invoice.vesselName}`, 300, detailsY);
        detailsY += 15;
      }

      const tableTop = 280;
      doc.moveTo(50, tableTop)
         .lineTo(545, tableTop)
         .stroke();

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Description', 55, tableTop + 8)
         .text('Qty', 360, tableTop + 8)
         .text('Unit Price', 410, tableTop + 8)
         .text('VAT', 475, tableTop + 8)
         .text('Total', 510, tableTop + 8);

      doc.moveTo(50, tableTop + 25)
         .lineTo(545, tableTop + 25)
         .stroke();

      let yPosition = tableTop + 35;
      doc.font('Helvetica');

      invoice.lineItems.forEach((item, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(9)
           .text(item.description, 55, yPosition, { width: 300 })
           .text(item.quantity.toString(), 360, yPosition)
           .text(`£${item.unitPrice.toFixed(2)}`, 410, yPosition)
           .text(`${item.vatRate}%`, 475, yPosition)
           .text(`£${item.total.toFixed(2)}`, 510, yPosition);

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
         .text(`£${invoice.subtotal.toFixed(2)}`, 510, yPosition);

      yPosition += 18;
      doc.text('VAT:', 400, yPosition)
         .text(`£${invoice.vat.toFixed(2)}`, 510, yPosition);

      yPosition += 18;
      doc.moveTo(400, yPosition)
         .lineTo(545, yPosition)
         .stroke();

      yPosition += 10;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Total:', 400, yPosition)
         .text(`£${invoice.total.toFixed(2)}`, 510, yPosition);

      yPosition += 40;
      if (yPosition > 680) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('PAYMENT TERMS:', 50, yPosition);
      
      yPosition += 15;
      doc.fontSize(8)
         .font('Helvetica')
         .text('Payment is due within 30 days of invoice date.', 50, yPosition)
         .text('Please quote invoice number with payment.', 50, yPosition + 12)
         .text('Bank details available on request.', 50, yPosition + 24);

      yPosition += 50;
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
