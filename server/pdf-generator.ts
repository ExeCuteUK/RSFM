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
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header - RS Logo
      const logoPath = path.join(process.cwd(), 'attached_assets', 'RS-google-logo_1759913900735.jpg');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 45, { width: 140 });
        } catch (e) {
          console.error('Error loading logo:', e);
        }
      }

      // Header - INVOICE Title
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('INVOICE', 220, 50);

      // Header - Company Details (right side)
      doc.fontSize(9)
         .font('Helvetica')
         .text('10b Hornsby Square', 400, 50)
         .text('Landon', 400, 62)
         .text('Essex, SS15 6SD', 400, 74)
         .text('Tel: 01708 865000', 400, 90)
         .text('Fax: 01708 865010', 400, 102);

      // Invoice Details (right side below company details)
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`Invoice No. ${invoice.invoiceNumber}`, 400, 125);

      doc.fontSize(9)
         .font('Helvetica')
         .text(`Date/Tax Point : ${new Date(invoice.taxPointDate || invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`, 400, 140)
         .text(`Our Ref : ${invoice.ourRef || invoice.jobRef}`, 400, 152)
         .text(`Exporters Ref : ${invoice.exportersRef || ''}`, 400, 164);

      // BIFA Logo placeholder (top right) - Add BIFA logo image here if available
      const bifaPath = path.join(process.cwd(), 'attached_assets', 'bifa-logo.jpg');
      if (fs.existsSync(bifaPath)) {
        try {
          doc.image(bifaPath, 480, 180, { width: 60 });
        } catch (e) {
          // BIFA logo not available
        }
      }

      // Invoice To Section
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('INVOICE TO', 50, 200);

      doc.rect(50, 215, 280, 60)
         .stroke();

      doc.fontSize(9)
         .font('Helvetica');
      
      let invoiceToY = 220;
      if (invoice.customerCompanyName) {
        doc.text(invoice.customerCompanyName, 55, invoiceToY);
        invoiceToY += 12;
      }
      
      if (invoice.customerAddress) {
        const addressLines = invoice.customerAddress.split('\n').slice(0, 3);
        addressLines.forEach(line => {
          doc.text(line.trim(), 55, invoiceToY);
          invoiceToY += 12;
        });
      }

      // VAT Number in Invoice To box
      if (invoice.customerVatNumber) {
        doc.fontSize(8)
           .font('Helvetica')
           .text(`VAT No.`, 55, 263)
           .text(invoice.customerVatNumber, 85, 263);
      }

      // Shipment Details Table (No Packages, Commodity, KGS, CBM)
      const shipmentTableY = 290;
      doc.rect(50, shipmentTableY, 495, 60)
         .stroke();

      // Table headers
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('No. Packages', 55, shipmentTableY + 5)
         .text('Commodity', 155, shipmentTableY + 5)
         .text('KGS', 415, shipmentTableY + 5)
         .text('CBM', 470, shipmentTableY + 5);

      // Vertical lines
      doc.moveTo(150, shipmentTableY).lineTo(150, shipmentTableY + 60).stroke();
      doc.moveTo(410, shipmentTableY).lineTo(410, shipmentTableY + 60).stroke();
      doc.moveTo(465, shipmentTableY).lineTo(465, shipmentTableY + 60).stroke();

      // Horizontal line after headers
      doc.moveTo(50, shipmentTableY + 18).lineTo(545, shipmentTableY + 18).stroke();

      // Shipment data
      doc.fontSize(9)
         .font('Helvetica')
         .text(invoice.numberOfPackages ? `${invoice.numberOfPackages} ${invoice.packingType || ''}`.trim() : '', 55, shipmentTableY + 25, { width: 90 })
         .text(invoice.commodity || '', 155, shipmentTableY + 25, { width: 250 })
         .text(invoice.kgs || '', 415, shipmentTableY + 25)
         .text(invoice.cbm || '', 470, shipmentTableY + 25);

      // Consignor/Consignee Section
      const consignorY = 365;
      doc.rect(50, consignorY, 495, 100)
         .stroke();

      // Consignor column
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('CONSIGNOR', 55, consignorY + 5);

      doc.fontSize(8)
         .font('Helvetica');
      
      let consignorTextY = consignorY + 20;
      if (invoice.consignorName) {
        doc.text(invoice.consignorName, 55, consignorTextY, { width: 190 });
        consignorTextY += 12;
      }
      if (invoice.consignorAddress) {
        const consignorLines = invoice.consignorAddress.split('\n').slice(0, 5);
        consignorLines.forEach(line => {
          if (consignorTextY < consignorY + 95) {
            doc.text(line.trim(), 55, consignorTextY, { width: 190 });
            consignorTextY += 10;
          }
        });
      }

      // Shipping details column (middle)
      const middleX = 250;
      doc.fontSize(7)
         .font('Helvetica')
         .text('TRAILER/CONT NO.', middleX, consignorY + 5)
         .text('VESSEL/FLIGHT NO.', middleX, consignorY + 20)
         .text('DATE OF SHIPMENT', middleX, consignorY + 35)
         .text('PORT DISCHARGE', middleX, consignorY + 50)
         .text('DELIVERY TERMS', middleX, consignorY + 65)
         .text('DESTINATION', middleX, consignorY + 80);

      doc.font('Helvetica-Bold')
         .text(invoice.trailerContainerNo || 'TBA', middleX + 95, consignorY + 5)
         .text(invoice.vesselFlightNo || 'FAV', middleX + 95, consignorY + 20)
         .text(invoice.dateOfShipment ? new Date(invoice.dateOfShipment).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '', middleX + 95, consignorY + 35)
         .text(invoice.portLoading || 'Calais', middleX + 95, consignorY + 50)
         .text(invoice.portDischarge || '', middleX + 95, consignorY + 65)
         .text(invoice.deliveryTerms || '', middleX + 95, consignorY + 80);

      // Consignee column (right)
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('CONSIGNEE', 410, consignorY + 5);

      doc.fontSize(8)
         .font('Helvetica');
      
      let consigneeTextY = consignorY + 20;
      if (invoice.consigneeName) {
        doc.text(invoice.consigneeName, 410, consigneeTextY, { width: 130 });
        consigneeTextY += 12;
      }
      if (invoice.consigneeAddress) {
        const consigneeLines = invoice.consigneeAddress.split('\n').slice(0, 5);
        consigneeLines.forEach(line => {
          if (consigneeTextY < consignorY + 95) {
            doc.text(line.trim(), 410, consigneeTextY, { width: 130 });
            consigneeTextY += 10;
          }
        });
      }
      
      if (invoice.destination) {
        doc.fontSize(8)
           .font('Helvetica')
           .text(invoice.destination, 410, consignorY + 85, { width: 130 });
      }

      // Vertical dividers in consignor section
      doc.moveTo(245, consignorY).lineTo(245, consignorY + 100).stroke();
      doc.moveTo(405, consignorY).lineTo(405, consignorY + 100).stroke();

      // Description of Charges Table
      const chargesTableY = 480;
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('DESCRIPTION OF CHARGES', 50, chargesTableY);

      const chargesY = chargesTableY + 20;
      
      // Table header
      doc.rect(50, chargesY, 495, 18)
         .fillAndStroke('#f0f0f0', '#000000');

      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('Description', 55, chargesY + 5)
         .text('CHARGE AMOUNT', 360, chargesY + 5)
         .text('VAT AMOUNT', 450, chargesY + 5)
         .text('VAT CODE', 510, chargesY + 5);

      // Line items
      let yPosition = chargesY + 18;
      doc.font('Helvetica');

      const lineItems = invoice.lineItems || [];
      lineItems.forEach((item: any, index: number) => {
        if (yPosition > 680) {
          doc.addPage();
          yPosition = 50;
        }

        const rowHeight = 18;
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.rect(50, yPosition, 495, rowHeight)
             .fillAndStroke('#fafafa', '#000000');
        } else {
          doc.rect(50, yPosition, 495, rowHeight)
             .stroke();
        }

        doc.fillColor('#000000')
           .fontSize(8)
           .text(item.description, 55, yPosition + 5, { width: 290 })
           .text(`${parseFloat(item.chargeAmount || '0').toFixed(2)}`, 380, yPosition + 5)
           .text(`${parseFloat(item.vatAmount || '0').toFixed(2)}`, 465, yPosition + 5)
           .text(item.vatCode, 520, yPosition + 5);

        yPosition += rowHeight;
      });

      // Totals section
      yPosition += 10;
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('INVOICE TOTAL', 360, yPosition)
         .text(`${invoice.subtotal.toFixed(2)}`, 460, yPosition);

      yPosition += 15;
      doc.text('VAT TOTAL', 360, yPosition)
         .text(`${invoice.vat.toFixed(2)}`, 460, yPosition);

      yPosition += 20;
      doc.rect(350, yPosition, 195, 20)
         .fillAndStroke('#f0f0f0', '#000000');

      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('GRAND TOTAL', 360, yPosition + 5)
         .text(`${invoice.total.toFixed(2)}`, 460, yPosition + 5)
         .text('PDS STERLING', 490, yPosition + 5);

      // VAT CODE legend
      yPosition += 35;
      if (yPosition > 720) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('VAT CODE', 50, yPosition)
         .text('VAT RATE', 140, yPosition)
         .text('INVOICE TOTAL', 360, yPosition)
         .text(`${invoice.subtotal.toFixed(2)}`, 460, yPosition);

      yPosition += 12;
      doc.fontSize(8)
         .font('Helvetica')
         .text('1', 50, yPosition)
         .text('0.00% ZERO RATED', 140, yPosition);

      yPosition += 10;
      doc.text('2', 50, yPosition)
         .text('20.00% STANDARD', 140, yPosition)
         .text('VAT TOTAL', 360, yPosition)
         .text(`${invoice.vat.toFixed(2)}`, 460, yPosition);

      yPosition += 10;
      doc.text('3', 50, yPosition)
         .text('0.00% EXEMPT', 140, yPosition);

      yPosition += 15;
      doc.rect(350, yPosition, 195, 15)
         .fillAndStroke('#f0f0f0', '#000000');

      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('GRAND TOTAL', 360, yPosition + 3)
         .text(`${invoice.total.toFixed(2)}`, 460, yPosition + 3)
         .text('PDS STERLING', 490, yPosition + 3);

      // Payment terms and bank details
      yPosition += 25;
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(8)
         .font('Helvetica')
         .text(invoice.paymentTerms || 'PAYMENT - Due now, please remit to the above address', 50, yPosition, { width: 495 });

      yPosition += 20;
      doc.fontSize(7)
         .text('VAT No. GB 656 7314 17', 50, yPosition);

      yPosition += 12;
      doc.text('Please direct all payments to R.S International Freight Ltd', 50, yPosition);
      doc.text('Bankers:', 50, yPosition + 10);
      doc.text('Barclays Bank PLC', 50, yPosition + 20);
      doc.text('Holborn Circus Branch', 50, yPosition + 30);
      doc.text('London EC1', 50, yPosition + 40);
      doc.text('Sort Code: 20 00 20', 50, yPosition + 50);
      doc.text('Account No: 69103569', 50, yPosition + 60);

      doc.text('Thank you for your custom', 400, yPosition + 60);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
