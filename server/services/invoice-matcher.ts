import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer, Haulier, ClearanceAgent, ShippingLine } from '@shared/schema';

interface JobData {
  importShipments: ImportShipment[];
  exportShipments: ExportShipment[];
  customClearances: CustomClearance[];
  importCustomers: ImportCustomer[];
  exportCustomers: ExportCustomer[];
  hauliers: Haulier[];
  clearanceAgents: ClearanceAgent[];
  shippingLines: ShippingLine[];
}

export interface InvoiceMatchResult {
  jobRef: number;
  jobType: 'import' | 'export' | 'clearance';
  confidence: number;
  matchedFields: {
    field: string;
    value: string;
    score: number;
  }[];
  job: ImportShipment | ExportShipment | CustomClearance;
  customerName?: string;
}

interface ExtractedAmounts {
  netTotal?: string;
  vat?: string;
  grossTotal?: string;
  allAmounts: string[];
}

export interface InvoiceAnalysis {
  isCreditNote: boolean;
  extractedData: {
    jobReferences: string[];
    containerNumbers: string[];
    truckNumbers: string[];
    customerReferences: string[];
    companyNames: string[];
    supplierName?: string;  // Invoice FROM company
    customerName?: string;  // Invoice TO company
    weights: string[];
    amounts: ExtractedAmounts;
    invoiceNumbers: string[];
    dates: string[];
    rawText: string;  // Full OCR text for full-text search
  };
  matches: InvoiceMatchResult[];
  rawText: string;
}

/**
 * Searchable database built from filtered jobs
 */
interface SearchableDatabase {
  companyNames: Map<string, { jobRef: number; jobType: string; fieldName: string }[]>;
  containerNumbers: Map<string, { jobRef: number; jobType: string }[]>;
  jobReferences: Map<string, { jobRef: number; jobType: string }[]>;
  customerReferences: Map<string, { jobRef: number; jobType: string; fieldName: string }[]>;
  weights: Map<number, { jobRef: number; jobType: string }[]>;
  vesselNames: Map<string, { jobRef: number; jobType: string }[]>;
}

export class InvoiceMatchingEngine {
  private jobData: JobData;

  constructor(jobData: JobData) {
    this.jobData = jobData;
  }

  /**
   * Main entry point: analyzes OCR text and returns matched jobs
   */
  public analyzeInvoice(ocrText: string): InvoiceAnalysis {
    // Apply OCR character corrections before processing
    const correctedText = this.correctOCRErrors(ocrText);
    
    const isCreditNote = this.detectCreditNote(correctedText);
    const extractedData = this.extractData(correctedText);
    const matches = this.findMatches(extractedData);

    return {
      isCreditNote,
      extractedData,
      matches: matches.sort((a, b) => b.confidence - a.confidence),
      rawText: ocrText,
    };
  }

  /**
   * Correct common OCR character misreads
   * IMPORTANT: Preserve $ when it's a currency symbol (followed by amount pattern)
   */
  private correctOCRErrors(text: string): string {
    let corrected = text;
    
    // Fix $ → S in reference numbers but preserve currency symbols
    // Strategy: Identify reference numbers by specific patterns
    // Reference pattern: $<8+ chars starting with 0> e.g., $02038515 or $<has letters> e.g., $A1234567
    // Currency pattern: $<short number> or $<formatted amount> e.g., $500, $1,234.56
    
    corrected = corrected.replace(/\$([0-9A-Z]{6,})/g, (match, capture) => {
      // Replace if it's a long string starting with 0 (reference number pattern)
      if (capture.startsWith('0') && capture.length >= 8) {
        return 'S' + capture;
      }
      // Replace if it contains letters (mixed alphanumeric reference)
      if (/[A-Z]/.test(capture)) {
        return 'S' + capture;
      }
      // Replace if it's very long (10+ digits, unlikely to be a currency amount)
      if (capture.length >= 10 && /^\d+$/.test(capture)) {
        return 'S' + capture;
      }
      return match; // Keep original for normal currency amounts
    });
    
    // Common OCR errors in reference numbers
    corrected = corrected.replace(/\b0(?=[A-Z]{2,})/g, 'O'); // 0 before letters → O
    corrected = corrected.replace(/\bl(?=[0-9]{2,})/gi, 'I'); // l before numbers → I
    
    return corrected;
  }

  /**
   * Detect if document is a credit note
   */
  private detectCreditNote(text: string): boolean {
    const creditNotePatterns = [
      /credit\s*note/i,
      /credit\s*memo/i,
      /cn\s*#/i,
      /refund/i,
    ];

    return creditNotePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract all relevant data from OCR text
   */
  private extractData(text: string) {
    const { supplierName, customerName, allCompanies } = this.extractCompaniesWithContext(text);
    
    return {
      jobReferences: this.extractJobReferences(text),
      containerNumbers: this.extractContainerNumbers(text),
      truckNumbers: this.extractTruckNumbers(text),
      customerReferences: this.extractCustomerReferences(text),
      companyNames: allCompanies,
      supplierName,
      customerName,
      weights: this.extractWeights(text),
      amounts: this.extractAmounts(text),
      invoiceNumbers: this.extractInvoiceNumbers(text),
      dates: this.extractDates(text),
      rawText: text,  // Include raw OCR text for full-text search
    };
  }

  /**
   * Extract job reference numbers (26001-99999 range)
   */
  private extractJobReferences(text: string): string[] {
    const patterns = [
      /\b(2[6-9]\d{3}|[3-9]\d{4})\b/g, // 26000-99999
      /job\s*#?\s*(\d{5})/gi,
      /ref(?:erence)?[:\s]+(\d{5})/gi,
    ];

    const refs = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const num = parseInt(match[1] || match[0]);
        if (num >= 26001 && num <= 99999) {
          refs.add(num.toString());
        }
      }
    });

    return Array.from(refs);
  }

  /**
   * Extract container numbers with STRICT pattern matching
   * Containers ALWAYS match: XXXX####### (4 letters + 7 digits)
   * Handles "/" separators to extract multiple containers
   */
  private extractContainerNumbers(text: string): string[] {
    const containers = new Set<string>();
    
    // STRICT container pattern: exactly 4 letters + 7 digits (with optional spaces)
    // Examples: ONEU750635, MLE204 SY577, CMAU 0076925
    const strictContainerPattern = /\b([A-Z]{4}\s?\d{3}\s?\d{4})\b/gi;
    
    const matches = Array.from(text.matchAll(strictContainerPattern));
    for (const match of matches) {
      const raw = match[1];
      // Split on "/" to handle multiple containers: "ABCD1234567 / EFGH8901234"
      const parts = raw.split(/\s*\/\s*/);
      
      for (const part of parts) {
        // Normalize: remove all spaces
        const normalized = part.replace(/\s/g, '').toUpperCase();
        
        // Final validation: must be exactly 4 letters + 7 digits
        if (/^[A-Z]{4}\d{7}$/.test(normalized)) {
          containers.add(normalized);
        }
      }
    }
    
    return Array.from(containers);
  }

  /**
   * Detect UK postcodes (X## #XX, XX# #XX, XX## #XX patterns)
   */
  private isUKPostcode(value: string): boolean {
    const normalized = value.replace(/\s+/g, ' ').trim().toUpperCase();
    
    // UK postcode patterns: A9 9AA, A99 9AA, AA9 9AA, AA99 9AA, etc.
    const postcodePatterns = [
      /^[A-Z]{1}\d{1,2}\s?\d{1}[A-Z]{2}$/,     // A9 9AA, A99 9AA
      /^[A-Z]{2}\d{1,2}\s?\d{1}[A-Z]{2}$/,    // AA9 9AA, AA99 9AA
      /^[A-Z]{1}\d{1}[A-Z]{1}\s?\d{1}[A-Z]{2}$/, // A9A 9AA
      /^[A-Z]{2}\d{1}[A-Z]{1}\s?\d{1}[A-Z]{2}$/, // AA9A 9AA
    ];
    
    return postcodePatterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Extract truck/vehicle/flight numbers (anything NOT matching strict container format)
   * Handles "/" separators to extract multiple values
   */
  private extractTruckNumbers(text: string): string[] {
    const trucks = new Set<string>();
    
    // Common table header words to exclude
    const excludeWords = /^(seal|number|package|packages|b\/l|final|destination|marks|gross|volume|description|kind|goods|cbm|kgs|no|yes|date|from|to|port|loading|discharge)$/i;
    
    // Look for trigger words followed by nearby alphanumeric values
    const triggerPatterns = [
      /(?:vehicle|truck|trailer|flight)(?:\/container)?\s*(?:no|number|#)?[:\s]*([A-Z0-9\s\/\-]+)/gi,
      /reg(?:istration)?[:\s]+([A-Z0-9\s\/\-]+)/gi,
    ];
    
    triggerPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const raw = match[1].trim();
        
        // Split on "/" to handle multiple values: "34KBJ052 / 35ABC123"
        const parts = raw.split(/\s*\/\s*/);
        
        for (const part of parts) {
          const value = part.replace(/\s/g, '').toUpperCase();
          
          // Skip if it's a common header word
          if (excludeWords.test(value)) {
            continue;
          }
          
          // Skip if it matches the strict container format (4 letters + 7 digits)
          if (/^[A-Z]{4}\d{7}$/.test(value)) {
            continue;
          }
          
          // Skip if it has 5+ consecutive letters (filters table headers like "SEALNUMBER2")
          // Truck/flight numbers never have more than 4 consecutive letters
          const letterSequences = value.match(/[A-Z]+/g) || [];
          const maxLetterSequence = Math.max(...letterSequences.map(seq => seq.length), 0);
          if (maxLetterSequence >= 5) {
            continue;
          }
          
          // Skip if it has 5+ consecutive digits (filters reference numbers like "ATA2519658")
          // Truck/flight numbers never have more than 4 consecutive digits
          const digitSequences = value.match(/\d+/g) || [];
          const maxDigitSequence = Math.max(...digitSequences.map(seq => seq.length), 0);
          if (maxDigitSequence >= 5) {
            continue;
          }
          
          // Must be alphanumeric, reasonable length, not a postcode
          if (value.length >= 3 && value.length <= 25 && 
              /[A-Z0-9]/.test(value) && 
              !this.isUKPostcode(value)) {
            trucks.add(value);
          }
        }
      }
    });
    
    // Fallback: Search for standalone truck number patterns (e.g., "34KBJ052" in table cells)
    // without requiring trigger words nearby
    // Pattern: alphanumeric tokens with 2-4 letters and 3-8 digits mixed together
    const standalonePattern = /\b([A-Z0-9]{5,12})\b/g;
    const standaloneMatches = Array.from(text.matchAll(standalonePattern));
    
    for (const match of standaloneMatches) {
      const value = match[1].toUpperCase();
      
      // Skip if already found via trigger patterns
      if (trucks.has(value)) {
        continue;
      }
      
      // Skip if it's a common header word
      if (excludeWords.test(value)) {
        continue;
      }
      
      // Skip if it matches the strict container format (4 letters + 7 digits)
      if (/^[A-Z]{4}\d{7}$/.test(value)) {
        continue;
      }
      
      // Skip if it has 5+ consecutive letters
      const letterSequences = value.match(/[A-Z]+/g) || [];
      const maxLetterSequence = Math.max(...letterSequences.map(seq => seq.length), 0);
      if (maxLetterSequence >= 5) {
        continue;
      }
      
      // Skip if it has 5+ consecutive digits (filters reference numbers like "ATA2519658")
      const digitSequences = value.match(/\d+/g) || [];
      const maxDigitSequence = Math.max(...digitSequences.map(seq => seq.length), 0);
      if (maxDigitSequence >= 5) {
        continue;
      }
      
      // Skip if it's a UK postcode
      if (this.isUKPostcode(value)) {
        continue;
      }
      
      // Count total letters and digits
      const letterCount = (value.match(/[A-Z]/g) || []).length;
      const digitCount = (value.match(/\d/g) || []).length;
      
      // Must have mix of letters and digits in truck number range:
      // 2-4 letters, 3-8 digits (e.g., "34KBJ052" has 3 letters, 5 digits)
      if (letterCount >= 2 && letterCount <= 4 && 
          digitCount >= 3 && digitCount <= 8 &&
          value.length >= 5 && value.length <= 12) {
        trucks.add(value);
      }
    }
    
    return Array.from(trucks);
  }

  /**
   * Extract customer reference numbers
   */
  private extractCustomerReferences(text: string): string[] {
    // Handle OCR spelling errors: Refersice, Referance, Referense, etc.
    const patterns = [
      /customer\s*ref(?:erence|ersice|eranse|erence|ernce)?[:\s]+([A-Z0-9 -]{3,30})/gi,
      /your\s*ref(?:erence|ersice|eranse|erence|ernce)?[:\s]+([A-Z0-9 -]{3,30})/gi,
      /po\s*#?\s*([A-Z0-9 -]{3,30})/gi,
      /order\s*#?\s*([A-Z0-9 -]{3,30})/gi,
    ];

    const refs = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        // Split on newlines and take only the first line (the actual reference)
        const value = match[1].split(/[\n\r]+/)[0].trim();
        if (value.length >= 3 && value.length <= 30) {
          refs.add(value);
        }
      }
    });

    return Array.from(refs);
  }

  /**
   * Extract companies with context to identify supplier (FROM) vs customer (TO)
   * Enhanced to exclude companies under exclusion headers
   * Cross-references supplier against clearance agents and hauliers for accurate names
   */
  private extractCompaniesWithContext(text: string): { supplierName?: string; customerName?: string; allCompanies: string[] } {
    const lines = text.split('\n');
    const allCompanies = new Set<string>();
    const companiesWithContext: Array<{ name: string; hasExclusionHeader: boolean }> = [];
    let customerName: string | undefined;

    // Company name patterns - with AND without suffixes
    const companyPatternsWithSuffix = [
      /^(.+?\s+(?:ltd|limited|inc|corp|corporation|plc|llc|co))\.?$/i,
      /^(.+?\s+(?:gmbh|sa|srl|bv))\.?$/i,
    ];
    
    // Pattern for capitalized names (likely company names) - relaxed to allow short names like "Dell", "B&Q"
    const capitalizedNamePattern = /^([A-Z][A-Za-z0-9&\s]{1,80})$/;

    // Headers to EXCLUDE from Invoice From (these are customer/recipient/sender context)
    const exclusionHeaders = /(?:invoice\s*to|consignor|importer|exporter|sender|delivery)[:\s]*/i;
    
    // Context patterns for customer (TO) - for customerName detection
    const customerContext = /(?:invoice\s*to|customer|importer|consignee|buyer|to|bill\s*to)[:\s]*/i;

    // Track current header context (persists until blank line or new header)
    let currentExclusionState = false;
    let currentCustomerState = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Reset context on blank line (new section)
      if (line === '') {
        currentExclusionState = false;
        currentCustomerState = false;
        continue;
      }
      
      // Check if this line has exclusion headers - sets context for subsequent lines
      if (exclusionHeaders.test(line)) {
        currentExclusionState = true;
      }
      
      if (customerContext.test(line)) {
        currentCustomerState = true;
      }
      
      // Look for company names in current line
      // First try to match companies with legal suffixes
      companyPatternsWithSuffix.forEach(pattern => {
        const match = line.match(pattern);
        if (match && match[1].length >= 2 && match[1].length <= 100) {
          const companyName = match[1].trim();
          allCompanies.add(companyName);
          companiesWithContext.push({ name: companyName, hasExclusionHeader: currentExclusionState });
          
          // Set customer name if under customer context
          if (currentCustomerState && !customerName) {
            customerName = companyName;
          }
        }
      });
      
      // Try capitalized names (skip if line is a header)
      if (!exclusionHeaders.test(line) && !customerContext.test(line)) {
        const capMatch = line.match(capitalizedNamePattern);
        if (capMatch) {
          const companyName = capMatch[1].trim();
          if (companyName.length >= 2) {
            allCompanies.add(companyName);
            companiesWithContext.push({ name: companyName, hasExclusionHeader: currentExclusionState });
            
            if (currentCustomerState && !customerName) {
              customerName = companyName;
            }
          }
        }
      }
    }

    // Determine Invoice From: find company NOT under exclusion headers
    // BUT: if a company under "Importer:" matches a known clearance agent/haulier, use it as supplier
    let supplierName: string | undefined;
    
    // First, check if any excluded company matches our clearance agents/hauliers
    // This handles invoices where the agent appears under "Importer:" label
    for (const company of companiesWithContext) {
      if (company.hasExclusionHeader) {
        const matchedServiceProvider = this.crossReferenceSupplierName(company.name);
        if (matchedServiceProvider) {
          // This excluded company is actually a service provider - use it as supplier
          supplierName = matchedServiceProvider;
          break;
        }
      }
    }
    
    // If no service provider found in excluded companies, use the standard logic
    if (!supplierName) {
      for (const company of companiesWithContext) {
        if (!company.hasExclusionHeader) {
          supplierName = company.name;
          break; // Take the first one found without exclusion headers
        }
      }
      
      // Improve supplier name accuracy by cross-referencing against clearance agents and hauliers
      if (supplierName) {
        const improvedName = this.crossReferenceSupplierName(supplierName);
        if (improvedName) {
          supplierName = improvedName;
        }
      }
    }

    return {
      supplierName,
      customerName,
      allCompanies: Array.from(allCompanies),
    };
  }

  /**
   * Cross-reference extracted supplier name against clearance agents and hauliers
   * Returns the official database name if a match is found, undefined otherwise
   */
  private crossReferenceSupplierName(extractedName: string): string | undefined {
    const normalizedExtracted = extractedName.toLowerCase().trim();
    
    // Check clearance agents
    for (const agent of this.jobData.clearanceAgents || []) {
      const score = this.fuzzySearchScore(normalizedExtracted, agent.agentName);
      if (score > 0.7) {  // High confidence threshold
        return agent.agentName;
      }
    }
    
    // Check hauliers
    for (const haulier of this.jobData.hauliers || []) {
      const score = this.fuzzySearchScore(normalizedExtracted, haulier.haulierName);
      if (score > 0.7) {  // High confidence threshold
        return haulier.haulierName;
      }
    }
    
    // Check shipping lines
    for (const shippingLine of this.jobData.shippingLines || []) {
      const score = this.fuzzySearchScore(normalizedExtracted, shippingLine.shippingLineName);
      if (score > 0.7) {  // High confidence threshold
        return shippingLine.shippingLineName;
      }
    }
    
    return undefined;  // No match found, keep original
  }

  /**
   * Extract weights (kg, tonnes, lbs)
   */
  private extractWeights(text: string): string[] {
    const patterns = [
      /(\d+[,.]?\d*)\s*(?:kg|kgs|kilograms?)/gi,
      /(\d+[,.]?\d*)\s*(?:t|tonnes?|tons?)/gi,
      /(\d+[,.]?\d*)\s*(?:lbs?|pounds?)/gi,
      /(?:weight|wt)[:\s]+(\d+[,.]?\d*)/gi,
      /(?:gross|net)\s*(?:weight|wt|kgs?)[:\s]*(\d+[,.]?\d*)/gi,
      /(?:total|overall)\s*(?:weight|kgs?)[:\s]*(\d+[,.]?\d*)/gi,
    ];

    const weights = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].replace(',', '');
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0 && num < 100000) {
          weights.add(num.toString());
        }
      }
    });

    return Array.from(weights);
  }

  /**
   * Extract monetary amounts with labels (Net Total, VAT, Gross Total, etc.)
   */
  private extractAmounts(text: string): ExtractedAmounts {
    let netTotal: string | undefined;
    let vat: string | undefined;
    let grossTotal: string | undefined;
    const allAmounts = new Set<string>();

    // Net total patterns
    const netPatterns = [
      /(?:net|sub)\s*total[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
      /subtotal[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
    ];
    
    // VAT patterns
    const vatPatterns = [
      /vat[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
      /tax[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
    ];
    
    // Gross/Grand total patterns - including plain "Total:" and "Invoice Total:"
    const grossPatterns = [
      /(?:gross|grand)\s*total[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
      /(?:total|amount)\s*(?:due|payable)[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
      /(?:invoice\s*)?total[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
    ];
    
    // Generic amount patterns
    const genericPatterns = [
      /[£$€]\s?([\d,]+\.?\d{0,2})/g,
      /total[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
    ];

    // Extract net total
    netPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].replace(/,/g, '');
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0 && !netTotal) {
          netTotal = num.toFixed(2);
          allAmounts.add(netTotal);
        }
      }
    });

    // Extract VAT
    vatPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].replace(/,/g, '');
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0 && !vat) {
          vat = num.toFixed(2);
          allAmounts.add(vat);
        }
      }
    });

    // Extract gross total
    grossPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].replace(/,/g, '');
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0 && !grossTotal) {
          grossTotal = num.toFixed(2);
          allAmounts.add(grossTotal);
        }
      }
    });

    // Collect all other amounts
    genericPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].replace(/,/g, '');
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          allAmounts.add(num.toFixed(2));
        }
      }
    });

    return {
      netTotal,
      vat,
      grossTotal,
      allAmounts: Array.from(allAmounts),
    };
  }

  /**
   * Extract invoice numbers
   */
  private extractInvoiceNumbers(text: string): string[] {
    const patterns = [
      /invoice\s*(?:no|number|#)?[:\s]*(\d+)/gi,
      /inv\s*(?:no|number|#)?[:\s]*(\d+)/gi,
      /(?:no|number)[:\s]*(\d{6,})/gi,  // Generic long number sequences
    ];

    const numbers = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].trim();
        if (value.length >= 5 && value.length <= 20) {
          numbers.add(value);
        }
      }
    });

    return Array.from(numbers);
  }

  /**
   * Extract dates
   */
  private extractDates(text: string): string[] {
    const patterns = [
      /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g,  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      /\b(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g,    // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
    ];

    const dates = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        dates.add(match[1]);
      }
    });

    return Array.from(dates);
  }

  /**
   * Parse a date string to Date object (handles various formats)
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Try DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
      const dmyMatch = dateStr.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        const parsed = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      // Try YYYY/MM/DD, YYYY-MM-DD, or YYYY.MM.DD
      const ymdMatch = dateStr.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      // Try ISO format or other parseable formats
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the most likely invoice date from extracted dates
   * Prioritizes dates that appear near "Date:" or "Invoice Date:" labels
   * Falls back to the most recent date (invoices are dated close to current time)
   */
  private getInvoiceDate(dates: string[]): Date | null {
    if (dates.length === 0) return null;

    const parsedDates = dates
      .map(d => this.parseDate(d))
      .filter((d): d is Date => d !== null);

    if (parsedDates.length === 0) return null;

    // Sort by most recent first (invoices are typically recent, not old)
    parsedDates.sort((a, b) => b.getTime() - a.getTime());

    // Return the most recent valid date
    return parsedDates[0];
  }

  /**
   * Filter jobs by date range relative to invoice date
   * Only includes jobs where bookingDate is within:
   * - 3 months before invoice date
   * - 1 month after invoice date
   * Jobs without bookingDate are included (treated as potential matches)
   */
  private filterJobsByDate<T extends ImportShipment | ExportShipment | CustomClearance>(
    jobs: T[],
    invoiceDate: Date | null
  ): T[] {
    if (!invoiceDate || isNaN(invoiceDate.getTime())) {
      // No valid invoice date found, return all jobs
      return jobs;
    }

    const threeMonthsBefore = new Date(invoiceDate);
    threeMonthsBefore.setMonth(threeMonthsBefore.getMonth() - 3);

    const oneMonthAfter = new Date(invoiceDate);
    oneMonthAfter.setMonth(oneMonthAfter.getMonth() + 1);

    const passed: T[] = [];
    const failed: string[] = [];

    jobs.forEach(job => {
      const bookingDate = (job as any).bookingDate;
      const jobRef = (job as any).jobRef;
      
      // Include jobs without bookingDate (legacy/incomplete records)
      if (!bookingDate) {
        passed.push(job);
        return;
      }

      const date = new Date(bookingDate);
      if (isNaN(date.getTime())) {
        // Invalid date format - include to be safe
        passed.push(job);
        return;
      }

      if (date >= threeMonthsBefore && date <= oneMonthAfter) {
        passed.push(job);
      } else {
        failed.push(`${jobRef} (${bookingDate})`);
      }
    });

    if (failed.length > 0) {
      console.log(`  Jobs excluded by date filter: ${failed.join(', ')}`);
    }

    return passed;
  }

  /**
   * Find matching jobs based on extracted data
   */
  private findMatches(extractedData: InvoiceAnalysis['extractedData']): InvoiceMatchResult[] {
    const matches: InvoiceMatchResult[] = [];
    const { importShipments, exportShipments, customClearances, importCustomers, exportCustomers } = this.jobData;

    // Get invoice date and filter jobs by date range
    const invoiceDate = this.getInvoiceDate(extractedData.dates);
    
    console.log('\n--- CHECKING JOBS FOR MATCHES ---');
    if (invoiceDate && !isNaN(invoiceDate.getTime())) {
      console.log(`Invoice date detected: ${invoiceDate.toISOString().split('T')[0]}`);
      console.log(`Filtering jobs to date range: ${this.getDateRangeString(invoiceDate)}`);
    } else {
      console.log('No valid invoice date detected - checking all jobs');
    }

    // Filter jobs by date range (3 months before to 1 month after invoice date)
    const filteredImports = this.filterJobsByDate(importShipments, invoiceDate);
    const filteredExports = this.filterJobsByDate(exportShipments, invoiceDate);
    const filteredClearances = this.filterJobsByDate(customClearances, invoiceDate);

    console.log(`\nDate filtering results:`);
    console.log(`  Import Shipments: ${importShipments.length} → ${filteredImports.length}`);
    console.log(`  Export Shipments: ${exportShipments.length} → ${filteredExports.length}`);
    console.log(`  Custom Clearances: ${customClearances.length} → ${filteredClearances.length}`);

    // Build searchable database from filtered jobs
    const searchDb = this.buildSearchableDatabase(
      filteredImports,
      filteredExports,
      filteredClearances,
      [...importCustomers, ...exportCustomers]
    );

    // Search OCR text for database values
    const searchResults = this.searchTextForMatches(extractedData.rawText, searchDb);

    // Convert search results into match results
    console.log('\n--- CONVERTING SEARCH RESULTS TO MATCHES ---');
    searchResults.forEach((result) => {
      const { jobRef, jobType, matches: fieldMatches } = result;

      // Find the actual job object
      let job: ImportShipment | ExportShipment | CustomClearance | undefined;
      let customerName: string | undefined;

      if (jobType === 'import') {
        job = filteredImports.find(j => j.jobRef === jobRef);
        if (job) {
          const importJob = job as ImportShipment;
          if (importJob.importCustomerId) {
            const customer = importCustomers.find(c => c.id === importJob.importCustomerId);
            customerName = customer?.companyName;
          }
        }
      } else if (jobType === 'export') {
        job = filteredExports.find(j => j.jobRef === jobRef);
        if (job) {
          const customerId = (job as any).exportCustomerId;
          if (customerId) {
            const customer = exportCustomers.find(c => c.id === customerId);
            customerName = customer?.companyName;
          }
        }
      } else if (jobType === 'clearance') {
        job = filteredClearances.find(j => j.jobRef === jobRef);
        if (job) {
          const clearanceJob = job as CustomClearance;
          if (clearanceJob.importCustomerId) {
            const customer = [...importCustomers, ...exportCustomers].find(c => c.id === clearanceJob.importCustomerId);
            customerName = customer?.companyName;
          }
        }
      }

      if (job) {
        // Deduplicate matched fields - keep only one match per unique field type
        const uniqueFields = new Map<string, { field: string; value: string; score: number }>();
        fieldMatches.forEach(match => {
          const fieldType = match.field.split(':')[0]; // Extract base field type (e.g., "Company" from "Company: Customer")
          if (!uniqueFields.has(fieldType) || uniqueFields.get(fieldType)!.score < match.score) {
            uniqueFields.set(fieldType, match);
          }
        });
        
        const deduplicatedMatches = Array.from(uniqueFields.values());
        const uniqueFieldTypes = uniqueFields.size;
        
        // Require at least 3 unique field types for a match
        if (uniqueFieldTypes < 3) {
          console.log(`  ✗ Job #${jobRef} (${jobType}) filtered out - only ${uniqueFieldTypes} unique field type(s)`);
          return;
        }

        // Calculate overall confidence based on match scores
        const avgScore = deduplicatedMatches.reduce((sum, m) => sum + m.score, 0) / deduplicatedMatches.length;
        const matchCount = deduplicatedMatches.length;
        
        // Higher confidence with more matches and higher scores
        const confidence = Math.min(1.0, avgScore * (1 + (matchCount - 1) * 0.1));

        matches.push({
          jobRef,
          jobType: jobType as 'import' | 'export' | 'clearance',
          confidence,
          matchedFields: deduplicatedMatches,
          job,
          customerName,
        });

        console.log(`  ✓ Job #${jobRef} (${jobType}) matched with ${matchCount} unique field types, confidence ${confidence.toFixed(2)}`);
        deduplicatedMatches.forEach(m => {
          console.log(`    - ${m.field}: "${m.value}" (score: ${m.score.toFixed(2)})`);
        });
      }
    });

    console.log('--- END JOB MATCHING ---\n');

    return matches;
  }

  /**
   * Get a readable date range string for logging
   */
  private getDateRangeString(invoiceDate: Date): string {
    if (isNaN(invoiceDate.getTime())) {
      return 'Invalid date';
    }

    const threeMonthsBefore = new Date(invoiceDate);
    threeMonthsBefore.setMonth(threeMonthsBefore.getMonth() - 3);

    const oneMonthAfter = new Date(invoiceDate);
    oneMonthAfter.setMonth(oneMonthAfter.getMonth() + 1);

    return `${threeMonthsBefore.toISOString().split('T')[0]} to ${oneMonthAfter.toISOString().split('T')[0]}`;
  }

  /**
   * Search entire OCR text for database values using fuzzy matching
   * Returns jobs that have matching data in the invoice text
   */
  private searchTextForMatches(ocrText: string, searchDb: SearchableDatabase): Map<number, {
    jobRef: number;
    jobType: string;
    matches: { field: string; value: string; score: number }[];
  }> {
    const results = new Map<number, {
      jobRef: number;
      jobType: string;
      matches: { field: string; value: string; score: number }[];
    }>();

    const normalizedText = ocrText.toLowerCase();
    const normalizedTextNoSpaces = this.normalizeIdentifier(ocrText);

    // Helper to add match to results
    const addMatch = (jobRef: number, jobType: string, field: string, value: string, score: number) => {
      if (!results.has(jobRef)) {
        results.set(jobRef, { jobRef, jobType, matches: [] });
      }
      results.get(jobRef)!.matches.push({ field, value, score });
    };

    console.log('\n--- SEARCHING OCR TEXT FOR DATABASE VALUES ---');

    // Search for company names (use fuzzy matching with spaces preserved)
    let companyMatches = 0;
    searchDb.companyNames.forEach((jobs, companyName) => {
      const score = this.fuzzySearchScore(normalizedText, companyName);
      if (score > 0.7) {  // High confidence threshold for company names
        jobs.forEach(job => {
          addMatch(job.jobRef, job.jobType, `Company: ${job.fieldName}`, companyName, score);
          companyMatches++;
        });
      }
    });
    console.log(`  Company name matches: ${companyMatches}`);

    // Search for vessel names (use fuzzy matching for partial matches)
    let vesselMatches = 0;
    searchDb.vesselNames.forEach((jobs, vesselName) => {
      const score = this.fuzzySearchScore(normalizedText, vesselName);
      if (score > 0.65) {  // Slightly lower threshold for vessel names (allow more flexibility for partial matches)
        jobs.forEach(job => {
          addMatch(job.jobRef, job.jobType, 'Vessel Name', vesselName, score);
          vesselMatches++;
        });
      }
    });
    console.log(`  Vessel name matches: ${vesselMatches}`);

    // Search for container numbers (normalized match with fuzzy matching for 1-character difference)
    let containerMatches = 0;
    searchDb.containerNumbers.forEach((jobs, normalizedContainer) => {
      // Exact match (normalized)
      if (normalizedTextNoSpaces.includes(normalizedContainer)) {
        jobs.forEach(job => {
          addMatch(job.jobRef, job.jobType, 'Container/Vehicle Number', normalizedContainer, 1.0);
          containerMatches++;
        });
      } else {
        // Fuzzy match - allow 1 character difference using Levenshtein distance
        const fuzzyMatch = this.findFuzzyReferenceMatch(normalizedTextNoSpaces, normalizedContainer);
        if (fuzzyMatch) {
          jobs.forEach(job => {
            addMatch(job.jobRef, job.jobType, 'Container/Vehicle Number', normalizedContainer, 0.95); // Slightly lower score for fuzzy match
            containerMatches++;
          });
        }
      }
    });
    console.log(`  Container/vehicle matches: ${containerMatches}`);

    // Search for job references (normalized match with fuzzy matching for 1-character difference)
    let jobRefMatches = 0;
    searchDb.jobReferences.forEach((jobs, normalizedJobRef) => {
      // Exact match (normalized)
      if (normalizedTextNoSpaces.includes(normalizedJobRef)) {
        jobs.forEach(job => {
          addMatch(job.jobRef, job.jobType, 'Job Reference', normalizedJobRef, 1.0);
          jobRefMatches++;
        });
      } else {
        // Fuzzy match - allow 1 character difference using Levenshtein distance
        const fuzzyMatch = this.findFuzzyReferenceMatch(normalizedTextNoSpaces, normalizedJobRef);
        if (fuzzyMatch) {
          jobs.forEach(job => {
            addMatch(job.jobRef, job.jobType, 'Job Reference', normalizedJobRef, 0.95); // Slightly lower score for fuzzy match
            jobRefMatches++;
          });
        }
      }
    });
    console.log(`  Job reference matches: ${jobRefMatches}`);

    // Search for customer references (normalized match with fuzzy matching for 1-character difference)
    let custRefMatches = 0;
    searchDb.customerReferences.forEach((jobs, normalizedCustRef) => {
      // Exact match (normalized)
      if (normalizedTextNoSpaces.includes(normalizedCustRef)) {
        jobs.forEach(job => {
          addMatch(job.jobRef, job.jobType, job.fieldName, normalizedCustRef, 1.0);
          custRefMatches++;
        });
      } else {
        // Fuzzy match - allow 1 character difference using Levenshtein distance
        const fuzzyMatch = this.findFuzzyReferenceMatch(normalizedTextNoSpaces, normalizedCustRef);
        if (fuzzyMatch) {
          jobs.forEach(job => {
            addMatch(job.jobRef, job.jobType, job.fieldName, normalizedCustRef, 0.95); // Slightly lower score for fuzzy match
            custRefMatches++;
          });
        }
      }
    });
    console.log(`  Customer reference matches: ${custRefMatches}`);

    // Search for weights (fuzzy match for numbers)
    let weightMatches = 0;
    searchDb.weights.forEach((jobs, weight) => {
      // Look for the weight number in text (allowing for decimal variations)
      const weightStr = weight.toString();
      const weightPattern = new RegExp(`\\b${weightStr.replace('.', '\\.')}\\b`, 'i');
      if (weightPattern.test(ocrText)) {
        jobs.forEach(job => {
          addMatch(job.jobRef, job.jobType, 'Weight', weightStr, 0.9);
          weightMatches++;
        });
      }
    });
    console.log(`  Weight matches: ${weightMatches}`);

    console.log(`Total unique jobs matched: ${results.size}`);
    console.log('---\n');

    return results;
  }

  /**
   * Normalize identifier for matching (removes spaces, lowercase)
   * Handles cases like "34 FBY 664" matching "34FBY664"
   */
  private normalizeIdentifier(value: string): string {
    return value.replace(/\s+/g, '').toLowerCase().trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Find fuzzy match for reference number in text (allows 1 character difference)
   * Returns true if a match is found within Levenshtein distance of 1
   */
  private findFuzzyReferenceMatch(text: string, reference: string): boolean {
    const refLen = reference.length;
    
    // Don't fuzzy match very short references
    if (refLen < 5) {
      return false;
    }

    // Search for substrings of same length as reference
    for (let i = 0; i <= text.length - refLen; i++) {
      const substring = text.substring(i, i + refLen);
      const distance = this.levenshteinDistance(substring, reference);
      
      // Allow 1 character difference
      if (distance <= 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fuzzy search score - returns similarity between 0 and 1
   * Uses simple substring matching with normalization
   */
  private fuzzySearchScore(text: string, searchTerm: string): number {
    const normalizedText = text.toLowerCase().trim();
    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Exact match
    if (normalizedText.includes(normalizedSearch)) {
      return 1.0;
    }

    // Check if all words in search term appear in text
    const searchWords = normalizedSearch.split(/\s+/);
    const matchedWords = searchWords.filter(word => normalizedText.includes(word));
    
    if (matchedWords.length === 0) {
      return 0;
    }

    // Score based on proportion of words matched
    const wordScore = matchedWords.length / searchWords.length;

    // Bonus if words appear close together
    if (wordScore === 1.0) {
      // All words present - check proximity
      return 0.95; // High score but not perfect since not exact match
    }

    return wordScore * 0.8; // Partial match
  }

  /**
   * Build searchable database from filtered jobs
   * Extracts all searchable values (company names, containers, references, weights)
   * from jobs so we can search for them in the OCR text
   */
  private buildSearchableDatabase(
    importShipments: ImportShipment[],
    exportShipments: ExportShipment[],
    customClearances: CustomClearance[],
    customers: (ImportCustomer | ExportCustomer)[]
  ): SearchableDatabase {
    const db: SearchableDatabase = {
      companyNames: new Map(),
      containerNumbers: new Map(),
      jobReferences: new Map(),
      customerReferences: new Map(),
      weights: new Map(),
      vesselNames: new Map(),
    };

    // Helper to add to map with optional normalization
    const addToMap = <T>(map: Map<string, T[]>, key: string, value: T, normalize: boolean = false) => {
      const mapKey = normalize ? this.normalizeIdentifier(key) : key.toLowerCase().trim();
      if (!map.has(mapKey)) {
        map.set(mapKey, []);
      }
      map.get(mapKey)!.push(value);
    };

    const addToWeightMap = (map: Map<number, any[]>, weight: number, value: any) => {
      if (!map.has(weight)) {
        map.set(weight, []);
      }
      map.get(weight)!.push(value);
    };

    // Process import shipments
    importShipments.forEach(job => {
      const jobRef = job.jobRef;
      const jobType = 'import';

      // Job reference (normalize to handle spaced numbers)
      addToMap(db.jobReferences, jobRef.toString(), { jobRef, jobType }, true);

      // Container/Vehicle numbers (normalize to handle "34 FBY 664" vs "34FBY664")
      if (job.trailerOrContainerNumber) {
        addToMap(db.containerNumbers, job.trailerOrContainerNumber, { jobRef, jobType }, true);
      }

      // Customer references (normalize to handle spaced references)
      if (job.customerReferenceNumber) {
        addToMap(db.customerReferences, job.customerReferenceNumber, { jobRef, jobType, fieldName: 'Customer Reference' }, true);
      }
      if (job.collectionReference) {
        addToMap(db.customerReferences, job.collectionReference, { jobRef, jobType, fieldName: 'Collection Reference' }, true);
      }
      if (job.haulierReference) {
        addToMap(db.customerReferences, job.haulierReference, { jobRef, jobType, fieldName: 'Haulier Reference' }, true);
      }
      if (job.deliveryReference) {
        addToMap(db.customerReferences, job.deliveryReference, { jobRef, jobType, fieldName: 'Delivery Reference' }, true);
      }

      // Weights
      if (job.weight) {
        const weight = parseFloat(job.weight.toString());
        if (!isNaN(weight)) {
          addToWeightMap(db.weights, weight, { jobRef, jobType });
        }
      }

      // Company names
      if (job.importCustomerId) {
        const customer = customers.find(c => c.id === job.importCustomerId);
        if (customer) {
          addToMap(db.companyNames, customer.companyName, { jobRef, jobType, fieldName: 'Customer' });
        }
      }

      // Vessel names
      if (job.vesselName) {
        addToMap(db.vesselNames, job.vesselName, { jobRef, jobType });
      }
    });

    // Process export shipments
    exportShipments.forEach(job => {
      const jobRef = job.jobRef;
      const jobType = 'export';

      addToMap(db.jobReferences, jobRef.toString(), { jobRef, jobType }, true);

      if (job.trailerNo) {
        addToMap(db.containerNumbers, job.trailerNo, { jobRef, jobType }, true);
      }

      if (job.customerReferenceNumber) {
        addToMap(db.customerReferences, job.customerReferenceNumber, { jobRef, jobType, fieldName: 'Customer Reference' }, true);
      }

      if (job.weight) {
        const weight = parseFloat(job.weight.toString());
        if (!isNaN(weight)) {
          addToWeightMap(db.weights, weight, { jobRef, jobType });
        }
      }

      // Export shipments have exportCustomerId
      const customerId = (job as any).exportCustomerId;
      if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          addToMap(db.companyNames, customer.companyName, { jobRef, jobType, fieldName: 'Customer' });
        }
      }

      // Vessel names
      if (job.vesselName) {
        addToMap(db.vesselNames, job.vesselName, { jobRef, jobType });
      }
    });

    // Process custom clearances
    customClearances.forEach(job => {
      const jobRef = job.jobRef;
      const jobType = 'clearance';

      addToMap(db.jobReferences, jobRef.toString(), { jobRef, jobType }, true);

      if (job.containerShipment) {
        addToMap(db.containerNumbers, job.containerShipment, { jobRef, jobType }, true);
      }

      if (job.customerReferenceNumber) {
        addToMap(db.customerReferences, job.customerReferenceNumber, { jobRef, jobType, fieldName: 'Customer Reference' }, true);
      }

      // Custom clearances have grossWeight
      const grossWeight = (job as any).grossWeight;
      if (grossWeight) {
        const weight = parseFloat(grossWeight.toString());
        if (!isNaN(weight)) {
          addToWeightMap(db.weights, weight, { jobRef, jobType });
        }
      }

      if (job.importCustomerId) {
        const customer = customers.find(c => c.id === job.importCustomerId);
        if (customer) {
          addToMap(db.companyNames, customer.companyName, { jobRef, jobType, fieldName: 'Customer' });
        }
      }
    });

    console.log('\n--- SEARCHABLE DATABASE BUILT ---');
    console.log(`Company Names: ${db.companyNames.size}`);
    console.log(`Container Numbers: ${db.containerNumbers.size}`);
    console.log(`Job References: ${db.jobReferences.size}`);
    console.log(`Customer References: ${db.customerReferences.size}`);
    console.log(`Weights: ${db.weights.size}`);
    console.log(`Vessel Names: ${db.vesselNames.size}`);
    console.log('---\n');

    return db;
  }

  /**
   * Score a job against extracted data
   */
  private scoreJob(
    job: ImportShipment | ExportShipment | CustomClearance,
    jobType: 'import' | 'export' | 'clearance',
    extractedData: InvoiceAnalysis['extractedData'],
    customers: (ImportCustomer | ExportCustomer)[],
    debug = false
  ): InvoiceMatchResult {
    const matchedFields: InvoiceMatchResult['matchedFields'] = [];
    let totalScore = 0;

    if (debug) {
      console.log(`\n  Checking Job #${job.jobRef} (${jobType}):`);
    }

    // Job reference match (very high confidence)
    const jobRefMatch = extractedData.jobReferences.includes(job.jobRef.toString());
    if (debug) {
      console.log(`    Job Ref ${job.jobRef} in extracted refs ${JSON.stringify(extractedData.jobReferences)}? ${jobRefMatch}`);
    }
    if (jobRefMatch) {
      matchedFields.push({ field: 'Job Reference', value: job.jobRef.toString(), score: 50 });
      totalScore += 50;
    }

    // Container/Trailer number matches (high confidence)
    // Collect all possible container/trailer values from job (same field, different names per job type)
    const containerTrailerValues: Array<{ value: string; field: string }> = [];
    
    if ('trailerOrContainerNumber' in job && job.trailerOrContainerNumber) {
      containerTrailerValues.push({ 
        value: String(job.trailerOrContainerNumber), 
        field: 'Trailer/Container Number' 
      });
    }
    if ('trailerNo' in job && job.trailerNo) {
      containerTrailerValues.push({ 
        value: String(job.trailerNo), 
        field: 'Trailer Number' 
      });
    }
    if ('containerShipment' in job && job.containerShipment) {
      containerTrailerValues.push({ 
        value: String(job.containerShipment), 
        field: 'Container Shipment' 
      });
    }

    // Check if any container/trailer value matches extracted data
    // Strip all spaces and dashes for flexible matching
    const normalize = (str: string) => str.replace(/[\s-]/g, '').toUpperCase();
    
    for (const { value, field } of containerTrailerValues) {
      const normalizedJobValue = normalize(value);
      const matches = extractedData.containerNumbers.some(
        c => normalize(c) === normalizedJobValue
      ) || extractedData.truckNumbers.some(
        t => normalize(t) === normalizedJobValue
      );
      
      if (debug) {
        console.log(`    ${field} ${value} in extracted? ${matches}`);
      }
      
      if (matches) {
        matchedFields.push({ field, value, score: 40 });
        totalScore += 40;
        break; // Only count one container/trailer match to avoid double-scoring
      }
    }

    // Customer reference matches (high confidence) - check ALL reference fields
    const referenceFields = [
      { key: 'customerReferenceNumber', label: 'Customer Reference' },
      { key: 'collectionReference', label: 'Collection Reference' },
      { key: 'haulierReference', label: 'Haulier Reference' },
      { key: 'deliveryReference', label: 'Delivery Reference' },
    ];

    for (const { key, label } of referenceFields) {
      if (key in job && (job as any)[key]) {
        const jobRef = String((job as any)[key]);
        const refMatch = extractedData.customerReferences.some(
          r => r.toLowerCase().includes(jobRef.toLowerCase()) ||
               jobRef.toLowerCase().includes(r.toLowerCase())
        );
        if (debug && refMatch) {
          console.log(`    ${label} ${jobRef} matches extracted refs? ${refMatch}`);
        }
        if (refMatch) {
          matchedFields.push({ field: label, value: jobRef, score: 35 });
          totalScore += 35;
          break; // Only count one reference match to avoid double-scoring
        }
      }
    }

    // Weight match (medium confidence)
    if ('weight' in job && job.weight) {
      const weightValue = parseFloat(job.weight.toString());
      const weightMatch = extractedData.weights.some(w => {
        const extractedWeight = parseFloat(w);
        return Math.abs(extractedWeight - weightValue) < weightValue * 0.1; // 10% tolerance
      });
      if (debug) {
        console.log(`    Weight ${weightValue} matches extracted weights ${JSON.stringify(extractedData.weights)}? ${weightMatch}`);
      }
      if (weightMatch) {
        matchedFields.push({ field: 'Weight', value: job.weight.toString(), score: 20 });
        totalScore += 20;
      }
    }

    // Gross weight match for clearances
    if ('grossWeight' in job && job.grossWeight) {
      const weightValue = parseFloat(job.grossWeight.toString());
      const weightMatch = extractedData.weights.some(w => {
        const extractedWeight = parseFloat(w);
        return Math.abs(extractedWeight - weightValue) < weightValue * 0.1;
      });
      if (debug) {
        console.log(`    Gross Weight ${weightValue} matches extracted weights ${JSON.stringify(extractedData.weights)}? ${weightMatch}`);
      }
      if (weightMatch) {
        matchedFields.push({ field: 'Gross Weight', value: job.grossWeight.toString(), score: 20 });
        totalScore += 20;
      }
    }

    // Company name match (lower confidence, fuzzy)
    let customerName: string | undefined;
    const customerId = 'importCustomerId' in job ? job.importCustomerId : 
                      'exportCustomerId' in job ? job.exportCustomerId : null;
    
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        customerName = customer.companyName;
        const companyMatch = extractedData.companyNames.some(c => {
          return this.fuzzyCompanyMatch(c, customer.companyName);
        });
        if (debug) {
          console.log(`    Company Name ${customer.companyName} matches extracted companies ${JSON.stringify(extractedData.companyNames)}? ${companyMatch}`);
        }
        if (companyMatch) {
          matchedFields.push({ field: 'Company Name', value: customer.companyName, score: 15 });
          totalScore += 15;
        }
      }
    }

    if (debug && totalScore > 0) {
      console.log(`    → Final Score: ${totalScore} (${matchedFields.length} fields matched)`);
    }

    return {
      jobRef: job.jobRef,
      jobType,
      confidence: totalScore,
      matchedFields,
      job,
      customerName,
    };
  }

  /**
   * Fuzzy company name matching - handles Ltd/PLC variations and partial matching
   */
  private fuzzyCompanyMatch(extracted: string, jobCompany: string): boolean {
    // Normalize both names: lowercase, strip suffixes, remove extra spaces
    const normalize = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\b(ltd|limited|plc|llc|inc|corp|corporation|co|gmbh|sa|srl|bv)\.?\b/gi, '')
        .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
        .replace(/\s+/g, ' ')       // Normalize multiple spaces
        .trim();
    };
    
    const normalizedExtracted = normalize(extracted);
    const normalizedJob = normalize(jobCompany);
    
    // Check if one is a substring of the other (partial match)
    if (normalizedExtracted.includes(normalizedJob) || normalizedJob.includes(normalizedExtracted)) {
      return true;
    }
    
    // Check similarity for close matches
    const similarity = this.stringSimilarity(normalizedExtracted, normalizedJob);
    return similarity > 0.6;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
}
