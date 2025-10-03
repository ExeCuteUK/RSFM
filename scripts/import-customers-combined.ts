import { readFileSync } from 'fs';
import { db } from '../server/db';
import { importCustomers } from '../shared/schema';

function combineAddress(parts: string[]): string | null {
  const filtered = parts.map(p => p?.trim()).filter(p => p && p.length > 0);
  return filtered.length > 0 ? filtered.join(', ') : null;
}

async function importCustomersFromFile() {
  const fileContent = readFileSync('attached_assets/contacttest_1759497935945.txt', 'utf-8');
  const lines = fileContent.trim().split('\n');

  console.log(`Found ${lines.length} customers to import`);

  for (const line of lines) {
    const fields = line.split('##!');
    
    // Parse contact name - split by " / " if multiple names
    const contactNameRaw = fields[1]?.trim();
    const contactName = contactNameRaw ? contactNameRaw.split(' / ').map(n => n.trim()).filter(n => n) : [];
    
    // Parse email - split by ", " if multiple emails
    const emailRaw = fields[5]?.trim();
    const email = emailRaw ? emailRaw.split(',').map(e => e.trim()).filter(e => e) : [];
    
    // Combine address fields 6-11 into a single address
    const address = combineAddress([
      fields[6],  // Address Line 1
      fields[7],  // Address Line 2
      fields[8],  // Town
      fields[9],  // County
      fields[10], // Postcode
      fields[11]  // Country
    ]);
    
    // Parse agent contact name - split by " / " if multiple names
    const agentContactNameRaw = fields[13]?.trim();
    const agentContactName = agentContactNameRaw ? agentContactNameRaw.split(' / ').map(n => n.trim()).filter(n => n) : [];
    
    // Parse agent email - split by ", " if multiple emails
    const agentEmailRaw = fields[16]?.trim();
    const agentEmail = agentEmailRaw ? agentEmailRaw.split(',').map(e => e.trim()).filter(e => e) : [];
    
    // Combine agent address fields 17-22 into a single address
    const agentAddress = combineAddress([
      fields[17], // Address Line 1
      fields[18], // Address Line 2
      fields[19], // Town
      fields[20], // County
      fields[21], // Postcode
      fields[22]  // Country
    ]);
    
    // Determine VAT Payment Method from fields 24 and 25
    let vatPaymentMethod = null;
    if (fields[24]?.trim() === '1') {
      vatPaymentMethod = 'R.S Deferment';
    } else if (fields[25]?.trim() === '1') {
      vatPaymentMethod = 'Postponed VAT Accounting (PVA)';
    }
    
    const customerData = {
      companyName: fields[0]?.trim() || '',
      contactName: contactName.length > 0 ? contactName : null,
      vatNumber: fields[2]?.trim() || null,
      telephone: fields[3]?.trim() || null,
      email: email.length > 0 ? email : null,
      accountsEmail: null,
      address: address,
      agentName: fields[12]?.trim() || null,
      agentContactName: agentContactName.length > 0 ? agentContactName : null,
      agentVatNumber: null,
      agentTelephone: fields[14]?.trim() || null,
      agentEmail: agentEmail.length > 0 ? agentEmail : null,
      agentAccountsEmail: null,
      agentAddress: agentAddress,
      rsProcessCustomsClearance: fields[23]?.trim() === '1',
      agentInDover: fields[26]?.trim() || null,
      vatPaymentMethod: vatPaymentMethod,
      clearanceAgentDetails: fields[30]?.trim() || null,
      defaultDeliveryAddress: fields[28]?.trim() || null,
      defaultSuppliersName: fields[29]?.trim() || null,
      bookingInDetails: fields[31]?.trim() || null,
    };

    try {
      await db.insert(importCustomers).values(customerData);
      console.log(`✓ Imported: ${customerData.companyName}`);
    } catch (error) {
      console.error(`✗ Failed to import: ${customerData.companyName}`, error);
    }
  }

  console.log('Import complete!');
  process.exit(0);
}

importCustomersFromFile().catch(console.error);
