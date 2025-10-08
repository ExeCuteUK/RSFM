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
        margins: { top: 27, bottom: 27, left: 50, right: 50 }
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header - RS Logo (drawn first, so INVOICE text appears on top)
      const logoPath = path.join(process.cwd(), 'attached_assets', 'RS-google-logo_1759913900735.jpg');
      if (fs.existsSync(logoPath)) {
        try {
          // Logo positioned at Y=40
          doc.image(logoPath, 50, 40, { width: 140 });
        } catch (e) {
          console.error('Error loading logo:', e);
        }
      }

      // Header - INVOICE Title (drawn second, so it appears on top of logo)
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('INVOICE', 50, 20, { width: 140, align: 'center' });

      // Header - Company Details (right side with company name)
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('R.S. International Freight Ltd', 400, 40);
      
      doc.fontSize(9)
         .font('Helvetica')
         .text('10b Hornsby Square', 400, 54)
         .text('Landon', 400, 66)
         .text('Essex, SS15 6SD', 400, 78)
         .text('Tel: 01708 865000', 400, 94)
         .text('Fax: 01708 865010', 400, 106);

      // Invoice Details (right side below company details) - with aligned values
      const valueX = 490; // Align all values at this X position
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Invoice No.', 400, 129);
      doc.text(String(invoice.invoiceNumber), valueX, 129);

      doc.fontSize(9)
         .font('Helvetica')
         .text('Date/Tax Point :', 400, 144);
      doc.text(new Date(invoice.taxPointDate || invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }), valueX, 144);
      
      doc.text('Our Ref :', 400, 156);
      doc.text(invoice.ourRef || String(invoice.jobRef || ''), valueX, 156);
      
      if (invoice.exportersRef) {
        doc.font('Helvetica-Bold')
           .text('Exporters Ref :', 400, 168);
        doc.text(invoice.exportersRef, valueX, 168);
        doc.font('Helvetica'); // Reset to normal font
      } else {
        doc.text('Exporters Ref :', 400, 168);
        doc.text('', valueX, 168);
      }

      // BIFA Logo placeholder (top right) - Add BIFA logo image here if available
      const bifaPath = path.join(process.cwd(), 'attached_assets', 'bifa-logo.jpg');
      if (fs.existsSync(bifaPath)) {
        try {
          doc.image(bifaPath, 480, 180, { width: 60 });
        } catch (e) {
          // BIFA logo not available
        }
      }

      // Invoice To Section (moved up to reduce gap)
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('INVOICE TO', 50, 190);

      // No border around Invoice To box

      doc.fontSize(9);
      
      let invoiceToY = 210;
      if (invoice.customerCompanyName) {
        doc.font('Helvetica-Bold')
           .text(invoice.customerCompanyName, 50, invoiceToY);
        invoiceToY += 12;
      }
      
      doc.font('Helvetica');
      
      if (invoice.customerAddress) {
        // Filter out UK/United Kingdom from address
        const filteredAddress = invoice.customerAddress
          .replace(/,?\s*(UK|United Kingdom)\s*$/im, '')
          .replace(/\n\s*(UK|United Kingdom)\s*$/im, '');
        
        const addressLines = filteredAddress.split('\n').filter(line => line.trim());
        addressLines.forEach(line => {
          if (invoiceToY < 305) { // Ensure we don't overflow the box
            doc.text(line.trim(), 50, invoiceToY);
            invoiceToY += 10;
          }
        });
      }

      // VAT Number in Invoice To box
      if (invoice.customerVatNumber) {
        doc.fontSize(8)
           .font('Helvetica')
           .text(`VAT No.`, 50, 303)
           .text(invoice.customerVatNumber, 80, 303);
      }

      // Shipment Details Table (No Packages, Commodity, KGS, CBM) - No border - reduced gap
      const shipmentTableY = 278;

      // Table headers (no border)
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('No. Packages', 50, shipmentTableY, { underline: true })
         .text('Commodity', 150, shipmentTableY, { underline: true })
         .text('KGS', 410, shipmentTableY, { underline: true })
         .text('CBM', 465, shipmentTableY, { underline: true });

      // Shipment data - display multiple lines if available
      doc.fontSize(9)
         .font('Helvetica');
      
      const shipmentLines = invoice.shipmentLines && invoice.shipmentLines.length > 0 
        ? invoice.shipmentLines 
        : [{
            numberOfPackages: invoice.numberOfPackages || '',
            packingType: invoice.packingType || '',
            commodity: invoice.commodity || '',
            kgs: invoice.kgs || '',
            cbm: invoice.cbm || ''
          }];
      
      let shipmentY = shipmentTableY + 15;
      shipmentLines.forEach((line: any, index: number) => {
        if (index < 3) { // Limit to 3 lines maximum
          const packagesText = line.numberOfPackages ? `${line.numberOfPackages} ${line.packingType || ''}`.trim() : '';
          doc.text(packagesText, 50, shipmentY, { width: 90 })
             .text(line.commodity || '', 150, shipmentY, { width: 250 })
             .text(line.kgs || '', 410, shipmentY)
             .text(line.cbm || '', 465, shipmentY);
          shipmentY += 12; // Space between lines
        }
      });

      // Consignor/Consignee Section - dynamically positioned based on shipment table
      const consignorY = shipmentY + 35; // 15pt gap added above table

      // Equal width columns: 165pt each
      const col1X = 50;
      const col2X = 215;
      const col3X = 380;
      const colWidth = 165;

      // Draw border lines for consignor/consignee table
      doc.moveTo(50, consignorY).lineTo(545, consignorY).stroke(); // Top border
      doc.moveTo(50, consignorY).lineTo(50, consignorY + 88).stroke(); // Left border
      doc.moveTo(545, consignorY).lineTo(545, consignorY + 88).stroke(); // Right border

      // Consignor column (left)
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('CONSIGNOR', col1X + 5, consignorY + 5, { underline: true });

      doc.fontSize(8)
         .font('Helvetica');
      
      let consignorTextY = consignorY + 20;
      if (invoice.consignorName) {
        doc.text(invoice.consignorName, col1X + 5, consignorTextY, { width: colWidth - 10 });
        consignorTextY += 12;
      }
      if (invoice.consignorAddress) {
        // Filter out UK/United Kingdom from consignor address for export jobs
        let filteredConsignorAddress = invoice.consignorAddress;
        if (invoice.jobType === 'export') {
          filteredConsignorAddress = invoice.consignorAddress
            .replace(/,?\s*(UK|United Kingdom)\s*$/im, '')
            .replace(/\n\s*(UK|United Kingdom)\s*$/im, '');
        }
        
        const consignorLines = filteredConsignorAddress.split('\n').filter(line => line.trim()).slice(0, 5);
        consignorLines.forEach(line => {
          if (consignorTextY < consignorY + 95) {
            doc.text(line.trim(), col1X + 5, consignorTextY, { width: colWidth - 10 });
            consignorTextY += 10;
          }
        });
      }

      // Consignee column (middle)
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('CONSIGNEE', col2X + 5, consignorY + 5, { underline: true });

      doc.fontSize(8)
         .font('Helvetica');
      
      let consigneeTextY = consignorY + 20;
      if (invoice.consigneeName) {
        doc.text(invoice.consigneeName, col2X + 5, consigneeTextY, { width: colWidth - 10 });
        consigneeTextY += 12;
      }
      if (invoice.consigneeAddress) {
        // Filter address based on job type
        let filteredConsigneeAddress = invoice.consigneeAddress;
        if (invoice.jobType === 'import') {
          // For import jobs, remove all country info
          filteredConsigneeAddress = invoice.consigneeAddress
            .split('\n')
            .filter(line => line.trim())
            .slice(0, -1) // Remove last line (usually country)
            .join('\n');
        } else {
          // For export jobs, remove only UK/United Kingdom
          filteredConsigneeAddress = invoice.consigneeAddress
            .replace(/,?\s*(UK|United Kingdom)\s*$/im, '')
            .replace(/\n\s*(UK|United Kingdom)\s*$/im, '');
        }
        
        const consigneeLines = filteredConsigneeAddress.split('\n').filter(line => line.trim()).slice(0, 5);
        consigneeLines.forEach(line => {
          if (consigneeTextY < consignorY + 95) {
            doc.text(line.trim(), col2X + 5, consigneeTextY, { width: colWidth - 10 });
            consigneeTextY += 10;
          }
        });
      }

      // Shipping details column (right) - inline label: value format, moved up
      const labelX = col3X + 5;
      const shippingValueX = col3X + 50;
      
      doc.fontSize(7)
         .font('Helvetica')
         .text('Identifier:', labelX, consignorY + 5)
         .text('Vessel Name:', labelX, consignorY + 17)
         .text('Date:', labelX, consignorY + 29)
         .text('Port Load:', labelX, consignorY + 41)
         .text('Port Disch:', labelX, consignorY + 53)
         .text('Del Terms:', labelX, consignorY + 65)
         .text('Destination:', labelX, consignorY + 77);

      doc.font('Helvetica-Bold')
         .text(invoice.trailerContainerNo || 'TBA', shippingValueX, consignorY + 5, { width: 95 })
         .text(invoice.vesselFlightNo || 'FAV', shippingValueX, consignorY + 17, { width: 95 })
         .text(invoice.dateOfShipment ? new Date(invoice.dateOfShipment).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '', shippingValueX, consignorY + 29, { width: 95 })
         .text(invoice.portLoading || '', shippingValueX, consignorY + 41, { width: 95 })
         .text(invoice.portDischarge || '', shippingValueX, consignorY + 53, { width: 95 })
         .text(invoice.deliveryTerms || '', shippingValueX, consignorY + 65, { width: 95 })
         .text(invoice.destination || '', shippingValueX, consignorY + 77, { width: 95 });

      // Vertical dividers in consignor section (equal spacing)
      doc.moveTo(col2X, consignorY).lineTo(col2X, consignorY + 88).stroke();
      doc.moveTo(col3X, consignorY).lineTo(col3X, consignorY + 88).stroke();
      
      // Horizontal line below the section
      doc.moveTo(50, consignorY + 88).lineTo(545, consignorY + 88).stroke();

      // Description of Charges Table - positioned immediately below consignor table
      const chargesTableY = consignorY + 93; // 5pt gap below consignor table
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('DESCRIPTION OF CHARGES', 50, chargesTableY);

      const chargesY = chargesTableY + 10;
      
      // Table header
      doc.rect(50, chargesY, 495, 18)
         .fillAndStroke('#f0f0f0', '#000000');

      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('Description', 55, chargesY + 6)
         .text('CHARGE AMOUNT', 360, chargesY + 6)
         .text('VAT AMOUNT', 450, chargesY + 6)
         .text('CODE', 510, chargesY + 6);

      // Line items - 15pt gap below header
      let yPosition = chargesY + 33;
      doc.font('Helvetica');

      const lineItems = invoice.lineItems || [];
      lineItems.forEach((item: any, index: number) => {
        if (yPosition > 680) {
          doc.addPage();
          yPosition = 50;
        }

        const rowHeight = 11; // Increased for better readability

        doc.fillColor('#000000')
           .fontSize(8)
           .text(item.description, 55, yPosition + 3, { width: 290 })
           .text(`${parseFloat(item.chargeAmount || '0').toFixed(2)}`, 380, yPosition + 3)
           .text(`${parseFloat(item.vatAmount || '0').toFixed(2)}`, 465, yPosition + 3)
           .text(item.vatCode, 520, yPosition + 3);

        yPosition += rowHeight;
      });

      // VAT CODE legend (no totals here - they come after the legend)
      yPosition += 10;
      if (yPosition > 720) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('Code', 50, yPosition, { underline: true })
         .text('VAT RATE', 140, yPosition, { underline: true })
         .text('INVOICE TOTAL', 360, yPosition)
         .text(`${invoice.subtotal.toFixed(2)}`, 465, yPosition);

      yPosition += 12;
      doc.fontSize(8)
         .font('Helvetica')
         .text('1', 50, yPosition)
         .text('0.00% ZERO RATED', 140, yPosition);

      yPosition += 10;
      doc.text('2', 50, yPosition)
         .text('20.00% STANDARD', 140, yPosition)
         .text('VAT TOTAL', 360, yPosition)
         .text(`${invoice.vat.toFixed(2)}`, 465, yPosition);

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
         .text(`${invoice.total.toFixed(2)}`, 465, yPosition + 3)
         .text('GBP', 515, yPosition + 3);

      // Payment terms and bank details - 20pt gap added above
      yPosition += 45;
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
      doc.font('Helvetica-Bold')
         .text('Sort Code: 20 00 20', 50, yPosition + 50)
         .text('Account No: 69103569', 50, yPosition + 60);
      doc.font('Helvetica'); // Reset to normal font

      doc.font('Helvetica-Bold')
         .text('Thank you for your custom', 400, yPosition + 60);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
