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
  matchedSupplierName?: string;
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
  companyNames: Map<string, { jobRef: number; jobType: string; fieldName: string; originalValue: string }[]>;
  containerNumbers: Map<string, { jobRef: number; jobType: string }[]>;
  jobReferences: Map<string, { jobRef: number; jobType: string }[]>;
  customerReferences: Map<string, { jobRef: number; jobType: string; fieldName: string }[]>;
  weights: Map<number, { jobRef: number; jobType: string }[]>;
  vesselNames: Map<string, { jobRef: number; jobType: string }[]>;
  etaDates: Map<string, { jobRef: number; jobType: string; date: Date }[]>; // ETA Port dates as "YYYY-MM-DD" string keys
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
   * Enhanced with:
   * - Pattern recognition for "acting as agent for [Company]"
   * - Filtering of alphanumeric reference codes
   * - Cross-references supplier against clearance agents, hauliers, and shipping lines
   */
  private extractCompaniesWithContext(text: string): { supplierName?: string; customerName?: string; allCompanies: string[] } {
    const lines = text.split('\n');
    const allCompanies = new Set<string>();
    const companiesWithContext: Array<{ name: string; hasExclusionHeader: boolean; priority: number }> = [];
    let customerName: string | undefined;

    // **NEW**: Extract companies from "acting as agent for" phrases (high priority)
    // Captures full company names including parenthetical qualifiers like "(UK Branch)"
    // Uses greedy matching to capture everything on the line, then intelligently trims
    const agentPhrases = [
      /acting\s+as\s+agent\s+for\s+(.+?)(?:\n|$)/gi,
      /issued\s+by\s+(.+?)(?:\n|$)/gi,
      /on\s+behalf\s+of\s+(.+?)(?:\n|$)/gi,
      /service\s+provider\s+(.+?)(?:\n|$)/gi,
    ];

    agentPhrases.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        // Capture full line, then intelligently trim sentence-ending punctuation
        let companyName = match[1].trim()
          .replace(/\s+/g, ' ')                     // Normalize whitespace
          .replace(/\s*\.$/, '')                    // Remove trailing period (sentence end)
          .replace(/\s*[,;:]\s*$/, '')              // Remove trailing comma/semicolon
          .trim();
        
        // **IMPROVED**: Stop after legal suffix to avoid capturing address
        // e.g., "Maersk A/S Esplanaden 50..." → "Maersk A/S"
        const suffixMatch = companyName.match(/^(.+?\s+(?:ltd|limited|inc|corp|corporation|plc|llc|co|gmbh|sa|srl|bv|a\/s|as|ab|oy|oyj|aps))(?:\s|$)/i);
        if (suffixMatch) {
          companyName = suffixMatch[1].trim();
        } else {
          // If no suffix found, stop at numeric street address (e.g., "123 Main St")
          const addressMatch = companyName.match(/^([^0-9]+?)(?:\s+\d)/);
          if (addressMatch) {
            companyName = addressMatch[1].trim();
          }
        }
        
        // Stop at common sentence continuations (lowercase word after period indicates new sentence)
        const sentenceBreak = companyName.match(/\.\s+[a-z]/);
        if (sentenceBreak) {
          companyName = companyName.substring(0, sentenceBreak.index! + 1).trim();
        }
        
        if (companyName.length >= 5 && companyName.length <= 150) {
          allCompanies.add(companyName);
          // Priority 10 = highest (from agent phrases)
          companiesWithContext.push({ name: companyName, hasExclusionHeader: false, priority: 10 });
        }
      }
    });

    // Company name patterns - with AND without suffixes
    const companyPatternsWithSuffix = [
      /^(.+?\s+(?:ltd|limited|inc|corp|corporation|plc|llc|co))\.?$/i,
      /^(.+?\s+(?:gmbh|sa|srl|bv))\.?$/i,
      // Scandinavian and other international suffixes
      /^(.+?\s+(?:a\/s|as|ab|oy|oyj|aps|k\.s\.|sp\.|nv))\.?$/i,
    ];
    
    // Pattern for capitalized names (likely company names) - relaxed to allow short names like "Dell", "B&Q"
    const capitalizedNamePattern = /^([A-Z][A-Za-z0-9&\s]{1,80})$/;
    
    // **NEW**: Filter out alphanumeric reference codes (e.g., "MEDUJE071611", "ABCD1234567")
    // Reference codes have long consecutive digit runs (5+), unlike brand names like "WAREHOUSE24" (2 digits)
    // This preserves legitimate brand names while filtering booking/reference codes
    const isReferenceCode = (name: string): boolean => {
      // Must be all uppercase with no spaces
      if (name !== name.toUpperCase() || name.includes(' ')) {
        return false;
      }
      // Must be 10+ characters (reference codes are long)
      if (name.length < 10) {
        return false;
      }
      // Must have a run of 5+ consecutive digits (the key discriminator)
      // MEDUJE071611 has "071611" (6 digits) ✓ filtered
      // WAREHOUSE24 has "24" (2 digits) ✗ not filtered
      const hasLongDigitRun = /\d{5,}/.test(name);
      return hasLongDigitRun;
    };

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
          
          // **NEW**: Skip if this looks like a reference code
          if (isReferenceCode(companyName)) {
            return;  // Skip this match
          }
          
          allCompanies.add(companyName);
          // Priority 5 = medium (company with suffix)
          companiesWithContext.push({ name: companyName, hasExclusionHeader: currentExclusionState, priority: 5 });
          
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
          
          // Filter out common OCR artifacts and non-company text
          const isOcrArtifact = /^(Page|Invoice Number|Customer Code|Tax|Payment|Due Date|Total|Bill|Receipt|Statement|Document|Import Invoice|Export Invoice|Commercial Invoice)/i.test(companyName);
          
          // **NEW**: Skip if this looks like a reference code or OCR artifact
          // Allow names >= 3 characters to capture short logistics brands (APL, DSV, OOCL, MSC, etc.)
          if (!isReferenceCode(companyName) && !isOcrArtifact && companyName.length >= 3) {
            allCompanies.add(companyName);
            // Priority 1 = low (capitalized name without suffix)
            companiesWithContext.push({ name: companyName, hasExclusionHeader: currentExclusionState, priority: 1 });
            
            if (currentCustomerState && !customerName) {
              customerName = companyName;
            }
          }
        }
      }
    }

    // **DATABASE MATCH = ABSOLUTE PRIORITY**
    // If ANY company name matches Shipping Lines, Clearance Agents, or Hauliers database, use it
    let supplierName: string | undefined;
    
    // Strategy 1: Check ALL companies for database matches and find the BEST match
    // Database matches have 100% priority regardless of extraction context
    let bestDatabaseMatch: { name: string; dbName: string; score: number } | undefined;
    
    for (const company of companiesWithContext) {
      const result = this.crossReferenceSupplierNameWithScore(company.name);
      if (result) {
        // Found a database match - keep checking to find the best one by score
        if (!bestDatabaseMatch || result.score > bestDatabaseMatch.score) {
          bestDatabaseMatch = { name: company.name, dbName: result.dbName, score: result.score };
        }
      }
    }
    
    // If we found ANY database match, use it (100% priority)
    if (bestDatabaseMatch) {
      supplierName = bestDatabaseMatch.dbName;
    }
    
    // Strategy 2: Only if NO database match, fall back to extraction priority
    if (!supplierName) {
      const companiesSortedByPriority = [...companiesWithContext].sort((a, b) => b.priority - a.priority);
      
      // Pick highest priority company NOT under exclusion headers
      for (const company of companiesSortedByPriority) {
        if (!company.hasExclusionHeader) {
          supplierName = company.name;
          break;
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
   * Normalize company name for better fuzzy matching
   * Removes common prefixes, legal suffixes, and country codes
   */
  private normalizeCompanyName(name: string): string {
    let normalized = name.trim();
    
    // Remove parenthetical qualifiers BEFORE lowercasing (case-insensitive)
    normalized = normalized.replace(/\s*\([^)]*\)/gi, '');
    
    // Now lowercase
    normalized = normalized.toLowerCase();
    
    // Remove common shipping line prefixes (handle multi-word and repeated)
    // Keep removing until no more matches
    let previousLength = 0;
    while (normalized.length !== previousLength) {
      previousLength = normalized.length;
      normalized = normalized
        .replace(/^msc\s+/i, '')
        .replace(/^cma\s+cgm\s+/i, '')
        .replace(/^cma\s+/i, '')
        .replace(/^cgm\s+/i, '')
        .replace(/^maersk\s+/i, '')
        .replace(/^hapag[\s-]lloyd\s+/i, '')
        .replace(/^hapag\s+/i, '')
        .replace(/^lloyd\s+/i, '')
        .trim();
    }
    
    // Remove legal suffixes - keep removing until no more matches
    const suffixPatterns = [
      /\s+ltd\.?$/i,
      /\s+limited$/i,
      /\s+inc\.?$/i,
      /\s+corp\.?$/i,
      /\s+corporation$/i,
      /\s+plc\.?$/i,
      /\s+llc\.?$/i,
      /\s+co\.?$/i,
      /\s+gmbh$/i,
      /\s+s\.a\.?$/i,
      /\s+sa$/i,
      /\s+srl$/i,
      /\s+bv$/i,
      /\s+ag$/i,
      // Scandinavian and international suffixes
      /\s+a\/s$/i,
      /\s+as$/i,
      /\s+ab$/i,
      /\s+oy$/i,
      /\s+oyj$/i,
      /\s+aps$/i,
      /\s+nv$/i,
    ];
    
    previousLength = 0;
    while (normalized.length !== previousLength) {
      previousLength = normalized.length;
      suffixPatterns.forEach(pattern => {
        normalized = normalized.replace(pattern, '').trim();
      });
    }
    
    return normalized.trim();
  }

  /**
   * Cross-reference extracted supplier name with score
   * Returns the official database name and match score if a match is found
   */
  private crossReferenceSupplierNameWithScore(extractedName: string): { dbName: string; score: number } | undefined {
    const normalizedExtracted = this.normalizeCompanyName(extractedName);
    let bestMatch: { dbName: string; score: number } | undefined;
    
    // Check clearance agents
    for (const agent of this.jobData.clearanceAgents || []) {
      const normalizedAgent = this.normalizeCompanyName(agent.agentName);
      const score = this.fuzzySearchScore(normalizedExtracted, normalizedAgent);
      if (score > 0.65 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { dbName: agent.agentName, score };
      }
    }
    
    // Check hauliers
    for (const haulier of this.jobData.hauliers || []) {
      const normalizedHaulier = this.normalizeCompanyName(haulier.haulierName);
      const score = this.fuzzySearchScore(normalizedExtracted, normalizedHaulier);
      if (score > 0.65 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { dbName: haulier.haulierName, score };
      }
    }
    
    // Check shipping lines
    for (const shippingLine of this.jobData.shippingLines || []) {
      const normalizedShippingLine = this.normalizeCompanyName(shippingLine.shippingLineName);
      const score = this.fuzzySearchScore(normalizedExtracted, normalizedShippingLine);
      if (score > 0.65 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { dbName: shippingLine.shippingLineName, score };
      }
    }
    
    return bestMatch;
  }

  /**
   * Cross-reference extracted supplier name against clearance agents and hauliers
   * Returns the official database name if a match is found, undefined otherwise
   */
  private crossReferenceSupplierName(extractedName: string): string | undefined {
    const result = this.crossReferenceSupplierNameWithScore(extractedName);
    return result?.dbName;
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

    // Net total patterns - handle both positive and negative amounts
    const netPatterns = [
      /(?:net|sub)\s*total[:\s]+[£$€]?\s?(-?[\d,]+\.?\d{0,2})/gi,
      /subtotal[:\s]+[£$€]?\s?(-?[\d,]+\.?\d{0,2})/gi,
      // UK invoice formats: "SUB TOTAL GBP 207.50"
      /sub\s*total\s+(?:gbp|eur|usd)\s+(-?[\d,]+\.?\d{0,2})/gi,
      // Credit note format: amount before currency "-400.00 GBP"
      /(-[\d,]+\.?\d{0,2})\s+(?:gbp|eur|usd)/gi,
    ];
    
    // VAT patterns
    const vatPatterns = [
      /vat[:\s]+[£$€]?\s?(-?[\d,]+\.?\d{0,2})/gi,
      /tax[:\s]+[£$€]?\s?(-?[\d,]+\.?\d{0,2})/gi,
      // UK invoice formats: "VAT GBP 0.00"
      /vat\s+(?:gbp|eur|usd)\s+(-?[\d,]+\.?\d{0,2})/gi,
    ];
    
    // Gross/Grand total patterns - ORDERED BY PRIORITY (most specific first)
    const grossPatterns = [
      // Highest priority: "Total Payable Amount", "Total Net Amount"
      /total\s+(?:payable|net)\s+amount[:\s]*(?:gbp|eur|usd|\£|\$|\€)?\s*(-?[\d,]+[\.,]?\d{0,2})/gi,
      /(?:total|amount)\s*(?:due|payable)[:\s]+[£$€]?\s?(-?[\d,]+[\.,]?\d{0,2})/gi,
      /(?:gross|grand)\s*total[:\s]+[£$€]?\s?(-?[\d,]+[\.,]?\d{0,2})/gi,
      /(?:invoice\s*)?total[:\s]+[£$€]?\s?(-?[\d,]+[\.,]?\d{0,2})/gi,
      // UK invoice formats: "TOTAL GBP 207.50", "Sterling Equivalent TOTAL GBP 207.50"
      /(?:sterling\s+equivalent\s+)?total\s+(?:gbp|eur|usd)\s+(-?[\d,]+[\.,]?\d{0,2})/gi,
      // Amount BEFORE "All:" at document end - Transmec format: "GBP | 140,00" then "All:"
      // Matches currency followed by amount, then any separators, then "All:" on next line
      /(?:gbp|eur|usd|£|\$|€)\s*[\|]?\s*(-?[\d,]+[\.,]\d{2})\s*[\|\s\-]*\s*\n[\s\-]*\n?\s*all\s*:/gi,
    ];
    
    // Generic amount patterns
    const genericPatterns = [
      /[£$€]\s?([\d,]+\.?\d{0,2})/g,
      /total[:\s]+[£$€]?\s?([\d,]+\.?\d{0,2})/gi,
    ];

    // Extract net total (allow negative for credit notes)
    netPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        let value = match[1];
        // Handle European format: convert "140,00" to "140.00"
        if (/^\d{1,3}(?:[.,]\d{3})*[,]\d{2}$/.test(value)) {
          value = value.replace(/\./g, '').replace(',', '.');
        } else {
          value = value.replace(/,/g, '');
        }
        const num = parseFloat(value);
        if (!isNaN(num) && !netTotal) {
          netTotal = num.toFixed(2);
          allAmounts.add(Math.abs(num).toFixed(2)); // Store absolute value in allAmounts
        }
      }
    });

    // Extract VAT
    vatPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        let value = match[1];
        // Handle European format: convert "140,00" to "140.00"
        if (/^\d{1,3}(?:[.,]\d{3})*[,]\d{2}$/.test(value)) {
          value = value.replace(/\./g, '').replace(',', '.');
        } else {
          value = value.replace(/,/g, '');
        }
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0 && !vat) {
          vat = num.toFixed(2);
          allAmounts.add(vat);
        }
      }
    });

    // Extract gross total (allow negative for credit notes)
    grossPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        let value = match[1];
        // Handle European format: convert "140,00" to "140.00"
        // Check if it's European format (comma as decimal separator)
        if (/^\d{1,3}(?:[.,]\d{3})*[,]\d{2}$/.test(value)) {
          // Remove thousand separators (dots) and replace decimal comma with dot
          value = value.replace(/\./g, '').replace(',', '.');
        } else {
          // Standard format: just remove thousand separators (commas)
          value = value.replace(/,/g, '');
        }
        const num = parseFloat(value);
        if (!isNaN(num) && !grossTotal) {
          grossTotal = num.toFixed(2);
          allAmounts.add(Math.abs(num).toFixed(2)); // Store absolute value in allAmounts
        }
      }
    });

    // Collect all other amounts
    genericPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        let value = match[1];
        // Handle European format: convert "140,00" to "140.00"
        if (/^\d{1,3}(?:[.,]\d{3})*[,]\d{2}$/.test(value)) {
          value = value.replace(/\./g, '').replace(',', '.');
        } else {
          value = value.replace(/,/g, '');
        }
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          allAmounts.add(num.toFixed(2));
        }
      }
    });

    // **FIX**: If no net total found or if it's negative (and not a credit note), use gross total
    // Many invoices only have "Total Payable Amount" without separate Net/VAT breakdown
    if (!netTotal || (parseFloat(netTotal) < 0 && grossTotal && parseFloat(grossTotal) > 0)) {
      netTotal = grossTotal;
    }

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
      // Handle "No/.", "No.", "No:" formats with flexible separators
      /(?:no|number)[\/\.\:\s]+(\d{5,})/gi,
      // Handle formats like "4519275 of 21/10/2025" (invoice number followed by date)
      /\b(\d{6,})\s+of\s+\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi,
      // Generic long number sequences (fallback)
      /(?:no|number)[:\s]*(\d{6,})/gi,
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
   * Extract dates (handles both numeric and text-based formats)
   * Filters out invalid dates like sort codes
   * Returns dates in DD/MM/YY format
   */
  private extractDates(text: string): string[] {
    const patterns = [
      /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g,  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      /\b(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g,    // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
      // Text-based formats: "Oct 19, 2025", "October 19, 2025"
      /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/gi,
      // Day-first text formats: "19 Oct 2025", "19th October 2025"
      /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+\d{4})\b/gi,
    ];

    const dates = new Set<string>();
    const now = new Date();
    const threeYearsAgo = new Date(now);
    threeYearsAgo.setFullYear(now.getFullYear() - 3);
    const twoYearsAhead = new Date(now);
    twoYearsAhead.setFullYear(now.getFullYear() + 2);

    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const dateStr = match[1];
        // Parse and validate the date
        const parsed = this.parseDate(dateStr);
        if (parsed && !isNaN(parsed.getTime())) {
          // Only include dates within reasonable range (3 years ago to 2 years ahead)
          // This filters out sort codes like "18-50-08" which parse to year 2018
          if (parsed >= threeYearsAgo && parsed <= twoYearsAhead) {
            // Convert to DD/MM/YY format (British format as required)
            const day = parsed.getDate().toString().padStart(2, '0');
            const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
            const year = parsed.getFullYear().toString().slice(-2);
            dates.add(`${day}/${month}/${year}`);
          }
        }
      }
    });

    return Array.from(dates);
  }

  /**
   * Parse a date string to Date object (handles various formats including text-based)
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Month name mapping
      const monthMap: Record<string, string> = {
        'jan': '01', 'january': '01',
        'feb': '02', 'february': '02',
        'mar': '03', 'march': '03',
        'apr': '04', 'april': '04',
        'may': '05',
        'jun': '06', 'june': '06',
        'jul': '07', 'july': '07',
        'aug': '08', 'august': '08',
        'sep': '09', 'sept': '09', 'september': '09',
        'oct': '10', 'october': '10',
        'nov': '11', 'november': '11',
        'dec': '12', 'december': '12',
      };

      // Try text-based format: "Oct 19, 2025", "October 19, 2025"
      const textMonthFirst = dateStr.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
      if (textMonthFirst) {
        const [, monthName, day, year] = textMonthFirst;
        const month = monthMap[monthName.toLowerCase()];
        if (month) {
          const parsed = new Date(`${year}-${month}-${day.padStart(2, '0')}`);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }

      // Try day-first text format: "19 Oct 2025", "19th October 2025"
      const textDayFirst = dateStr.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/i);
      if (textDayFirst) {
        const [, day, monthName, year] = textDayFirst;
        const month = monthMap[monthName.toLowerCase()];
        if (month) {
          const parsed = new Date(`${year}-${month}-${day.padStart(2, '0')}`);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }

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
   * Date selection priority:
   * - Import Shipments: importDateEtaPort → bookingDate
   * - Export Shipments: bookingDate only
   * - Custom Clearances: etaPort → bookingDate
   * 
   * Only includes jobs where the selected date is within:
   * - 3 months before invoice date
   * - 1 month after invoice date
   * Jobs without any date are included (treated as potential matches)
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
      const jobRef = (job as any).jobRef;
      
      // Determine which date field to use based on job type
      let dateToCheck: string | null = null;
      let dateSource = '';
      
      // Check for import-specific ETA port date
      if ('importDateEtaPort' in job && (job as any).importDateEtaPort) {
        dateToCheck = (job as any).importDateEtaPort;
        dateSource = 'ETA Port';
      }
      // Check for clearance-specific ETA port date
      else if ('etaPort' in job && (job as any).etaPort) {
        dateToCheck = (job as any).etaPort;
        dateSource = 'ETA Port';
      }
      // Fall back to booking date
      else if ((job as any).bookingDate) {
        dateToCheck = (job as any).bookingDate;
        dateSource = 'Booking Date';
      }
      
      // Include jobs without any date (legacy/incomplete records)
      if (!dateToCheck) {
        passed.push(job);
        return;
      }

      const date = new Date(dateToCheck);
      if (isNaN(date.getTime())) {
        // Invalid date format - include to be safe
        passed.push(job);
        return;
      }

      if (date >= threeMonthsBefore && date <= oneMonthAfter) {
        passed.push(job);
      } else {
        failed.push(`${jobRef} (${dateToCheck} from ${dateSource})`);
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
      let matchedSupplierName: string | undefined;

      // Extract matched supplier name from company matches (exclude customers)
      // Only use shipping line, clearance agent, or haulier matches
      const supplierMatch = fieldMatches.find(m => 
        m.field === 'Company: Shipping Line' || 
        m.field === 'Company: Clearance Agent' || 
        m.field === 'Company: Haulier'
      );
      if (supplierMatch) {
        matchedSupplierName = supplierMatch.value;
      }

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
          const exportJob = job as any;
          if (exportJob.exportCustomerId) {
            const customer = exportCustomers.find(c => c.id === exportJob.exportCustomerId);
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
          matchedSupplierName,
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
          addMatch(job.jobRef, job.jobType, `Company: ${job.fieldName}`, job.originalValue, score);
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

    // Search for ETA dates (compare extracted dates against job ETA dates with ±7 day window)
    let etaDateMatches = 0;
    const extractedDates = this.extractDates(ocrText);
    extractedDates.forEach(dateStr => {
      const invoiceDate = this.parseDate(dateStr);
      if (invoiceDate && !isNaN(invoiceDate.getTime())) {
        // Check each ETA date in database
        searchDb.etaDates.forEach((jobs, etaDateKey) => {
          jobs.forEach(job => {
            const etaDate = job.date;
            // Calculate difference in days
            const diffMs = Math.abs(invoiceDate.getTime() - etaDate.getTime());
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            
            // Match if within 7 days
            if (diffDays <= 7) {
              const score = diffDays === 0 ? 1.0 : 0.95 - (diffDays * 0.05); // Higher score for closer dates
              addMatch(job.jobRef, job.jobType, 'ETA Date', etaDateKey, score);
              etaDateMatches++;
            }
          });
        });
      }
    });
    console.log(`  ETA date matches: ${etaDateMatches}`);

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
      etaDates: new Map(),
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

    const addToDateMap = (map: Map<string, any[]>, dateStr: string, value: any) => {
      const dateKey = dateStr; // Store as YYYY-MM-DD
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(value);
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
          addToMap(db.companyNames, customer.companyName, { jobRef, jobType, fieldName: 'Customer', originalValue: customer.companyName });
        }
      }

      // Shipping line
      if (job.shippingLine) {
        addToMap(db.companyNames, job.shippingLine, { jobRef, jobType, fieldName: 'Shipping Line', originalValue: job.shippingLine });
      }

      // Clearance agent
      if (job.clearanceAgent) {
        addToMap(db.companyNames, job.clearanceAgent, { jobRef, jobType, fieldName: 'Clearance Agent', originalValue: job.clearanceAgent });
      }

      // Haulier
      if (job.haulierName) {
        addToMap(db.companyNames, job.haulierName, { jobRef, jobType, fieldName: 'Haulier', originalValue: job.haulierName });
      }

      // Supplier name
      if (job.supplierName) {
        addToMap(db.companyNames, job.supplierName, { jobRef, jobType, fieldName: 'Supplier', originalValue: job.supplierName });
      }

      // Vessel names
      if (job.vesselName) {
        addToMap(db.vesselNames, job.vesselName, { jobRef, jobType });
      }

      // ETA Port dates
      if (job.importDateEtaPort) {
        try {
          const etaDate = new Date(job.importDateEtaPort);
          if (!isNaN(etaDate.getTime())) {
            const dateKey = etaDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            addToDateMap(db.etaDates, dateKey, { jobRef, jobType, date: etaDate });
          }
        } catch (e) {
          // Ignore invalid dates
        }
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
          addToMap(db.companyNames, customer.companyName, { jobRef, jobType, fieldName: 'Customer', originalValue: customer.companyName });
        }
      }

      // Clearance agents
      if (job.exportClearanceAgent) {
        addToMap(db.companyNames, job.exportClearanceAgent, { jobRef, jobType, fieldName: 'Clearance Agent', originalValue: job.exportClearanceAgent });
      }
      if (job.arrivalClearanceAgent) {
        addToMap(db.companyNames, job.arrivalClearanceAgent, { jobRef, jobType, fieldName: 'Clearance Agent', originalValue: job.arrivalClearanceAgent });
      }

      // Haulier
      if (job.haulierName) {
        addToMap(db.companyNames, job.haulierName, { jobRef, jobType, fieldName: 'Haulier', originalValue: job.haulierName });
      }

      // Supplier name (export shipments use 'supplier' field)
      if (job.supplier) {
        addToMap(db.companyNames, job.supplier, { jobRef, jobType, fieldName: 'Supplier', originalValue: job.supplier });
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
          addToMap(db.companyNames, customer.companyName, { jobRef, jobType, fieldName: 'Customer', originalValue: customer.companyName });
        }
      }

      // Clearance agent
      if (job.clearanceAgent) {
        addToMap(db.companyNames, job.clearanceAgent, { jobRef, jobType, fieldName: 'Clearance Agent', originalValue: job.clearanceAgent });
      }

      // Haulier
      if (job.haulierName) {
        addToMap(db.companyNames, job.haulierName, { jobRef, jobType, fieldName: 'Haulier', originalValue: job.haulierName });
      }

      // Supplier name
      if (job.supplierName) {
        addToMap(db.companyNames, job.supplierName, { jobRef, jobType, fieldName: 'Supplier', originalValue: job.supplierName });
      }

      // Vessel names
      if (job.vesselName) {
        addToMap(db.vesselNames, job.vesselName, { jobRef, jobType });
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
