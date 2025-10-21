import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer } from '@shared/schema';

interface JobData {
  importShipments: ImportShipment[];
  exportShipments: ExportShipment[];
  customClearances: CustomClearance[];
  importCustomers: ImportCustomer[];
  exportCustomers: ExportCustomer[];
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

export interface InvoiceAnalysis {
  isCreditNote: boolean;
  extractedData: {
    jobReferences: string[];
    containerNumbers: string[];
    truckNumbers: string[];
    customerReferences: string[];
    companyNames: string[];
    weights: string[];
    amounts: string[];
    invoiceNumbers: string[];
    dates: string[];
  };
  matches: InvoiceMatchResult[];
  rawText: string;
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
    const isCreditNote = this.detectCreditNote(ocrText);
    const extractedData = this.extractData(ocrText);
    const matches = this.findMatches(extractedData);

    return {
      isCreditNote,
      extractedData,
      matches: matches.sort((a, b) => b.confidence - a.confidence),
      rawText: ocrText,
    };
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
    return {
      jobReferences: this.extractJobReferences(text),
      containerNumbers: this.extractContainerNumbers(text),
      truckNumbers: this.extractTruckNumbers(text),
      customerReferences: this.extractCustomerReferences(text),
      companyNames: this.extractCompanyNames(text),
      weights: this.extractWeights(text),
      amounts: this.extractAmounts(text),
      invoiceNumbers: this.extractInvoiceNumbers(text),
      dates: this.extractDates(text),
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
   * Extract container numbers (standard format: 4 letters + 7 digits)
   */
  private extractContainerNumbers(text: string): string[] {
    const pattern = /\b[A-Z]{4}\s?\d{7}\b/g;
    const matches = Array.from(text.matchAll(pattern));
    return matches.map(m => m[0].replace(/\s/g, ''));
  }

  /**
   * Extract truck/vehicle registration numbers
   */
  private extractTruckNumbers(text: string): string[] {
    const patterns = [
      /truck\s*#?\s*([A-Z0-9\s-]+)/gi,
      /vehicle\s*#?\s*([A-Z0-9\s-]+)/gi,
      /reg(?:istration)?[:\s]+([A-Z0-9\s-]+)/gi,
      /\b([A-Z]{2}\d{2}\s?[A-Z]{3})\b/g, // UK reg format
    ];

    const trucks = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = (match[1] || match[0]).trim().toUpperCase();
        if (value.length >= 3 && value.length <= 15) {
          trucks.add(value);
        }
      }
    });

    return Array.from(trucks);
  }

  /**
   * Extract customer reference numbers
   */
  private extractCustomerReferences(text: string): string[] {
    const patterns = [
      /customer\s*ref(?:erence)?[:\s]+([A-Z0-9\s-]+)/gi,
      /your\s*ref(?:erence)?[:\s]+([A-Z0-9\s-]+)/gi,
      /po\s*#?\s*([A-Z0-9\s-]+)/gi,
      /order\s*#?\s*([A-Z0-9\s-]+)/gi,
    ];

    const refs = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].trim();
        if (value.length >= 3 && value.length <= 50) {
          refs.add(value);
        }
      }
    });

    return Array.from(refs);
  }

  /**
   * Extract company names from text
   */
  private extractCompanyNames(text: string): string[] {
    const lines = text.split('\n');
    const names = new Set<string>();

    // Look for lines with Ltd, Limited, Inc, Corp, etc.
    const companyPatterns = [
      /^(.+?\s+(?:ltd|limited|inc|corp|corporation|plc|llc|co))\.?$/i,
      /^(.+?\s+(?:gmbh|sa|srl|bv))\.?$/i,
    ];

    lines.forEach(line => {
      const trimmed = line.trim();
      companyPatterns.forEach(pattern => {
        const match = trimmed.match(pattern);
        if (match && match[1].length >= 5 && match[1].length <= 100) {
          names.add(match[1].trim());
        }
      });
    });

    return Array.from(names);
  }

  /**
   * Extract weights (kg, tonnes, lbs)
   */
  private extractWeights(text: string): string[] {
    const patterns = [
      /(\d+[,.]?\d*)\s*(?:kg|kgs|kilograms?)/gi,
      /(\d+[,.]?\d*)\s*(?:t|tonnes?|tons?)/gi,
      /(\d+[,.]?\d*)\s*(?:lbs?|pounds?)/gi,
      /weight[:\s]+(\d+[,.]?\d*)/gi,
      /gross[:\s]+(\d+[,.]?\d*)/gi,
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
   * Extract monetary amounts
   */
  private extractAmounts(text: string): string[] {
    const patterns = [
      /[£$€]\s?(\d+[,.]?\d*\.?\d{0,2})/g,
      /(?:total|amount|subtotal)[:\s]+[£$€]?\s?(\d+[,.]?\d*\.?\d{0,2})/gi,
    ];

    const amounts = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].replace(',', '');
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          amounts.add(num.toFixed(2));
        }
      }
    });

    return Array.from(amounts);
  }

  /**
   * Extract invoice numbers
   */
  private extractInvoiceNumbers(text: string): string[] {
    const patterns = [
      /invoice\s*#?\s*([A-Z0-9\s-]+)/gi,
      /inv\s*#?\s*([A-Z0-9\s-]+)/gi,
    ];

    const numbers = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const value = match[1].trim();
        if (value.length >= 3 && value.length <= 30) {
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
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g,
      /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
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
   * Find matching jobs based on extracted data
   */
  private findMatches(extractedData: InvoiceAnalysis['extractedData']): InvoiceMatchResult[] {
    const matches: InvoiceMatchResult[] = [];
    const { importShipments, exportShipments, customClearances, importCustomers, exportCustomers } = this.jobData;

    console.log('\n--- CHECKING JOBS FOR MATCHES ---');

    // Check import shipments
    console.log(`\nChecking ${importShipments.length} import shipments...`);
    importShipments.forEach(job => {
      const result = this.scoreJob(job, 'import', extractedData, importCustomers, true);
      if (result.confidence > 0) {
        matches.push(result);
        console.log(`  ✓ Job #${job.jobRef} matched with confidence ${result.confidence}`);
      }
    });

    // Check export shipments
    console.log(`\nChecking ${exportShipments.length} export shipments...`);
    exportShipments.forEach(job => {
      const result = this.scoreJob(job, 'export', extractedData, exportCustomers, true);
      if (result.confidence > 0) {
        matches.push(result);
        console.log(`  ✓ Job #${job.jobRef} matched with confidence ${result.confidence}`);
      }
    });

    // Check custom clearances
    console.log(`\nChecking ${customClearances.length} custom clearances...`);
    customClearances.forEach(job => {
      const result = this.scoreJob(job, 'clearance', extractedData, [...importCustomers, ...exportCustomers], true);
      if (result.confidence > 0) {
        matches.push(result);
        console.log(`  ✓ Job #${job.jobRef} matched with confidence ${result.confidence}`);
      }
    });

    console.log('--- END JOB MATCHING ---\n');

    return matches;
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
    // Check trailerOrContainerNumber (import/clearance)
    if ('trailerOrContainerNumber' in job && job.trailerOrContainerNumber) {
      const jobContainer = String(job.trailerOrContainerNumber);
      const containerMatch = extractedData.containerNumbers.some(
        c => c.replace(/\s/g, '').toUpperCase() === jobContainer.replace(/\s/g, '').toUpperCase()
      ) || extractedData.truckNumbers.some(
        t => t.replace(/\s/g, '').toUpperCase() === jobContainer.replace(/\s/g, '').toUpperCase()
      );
      if (debug) {
        console.log(`    Trailer/Container ${jobContainer} in extracted? ${containerMatch}`);
      }
      if (containerMatch) {
        matchedFields.push({ field: 'Trailer/Container Number', value: jobContainer, score: 40 });
        totalScore += 40;
      }
    }
    
    // Check trailerNo (export)
    if ('trailerNo' in job && job.trailerNo) {
      const jobTrailer = String(job.trailerNo);
      const trailerMatch = extractedData.truckNumbers.some(
        t => t.replace(/\s/g, '').toUpperCase() === jobTrailer.replace(/\s/g, '').toUpperCase()
      );
      if (debug) {
        console.log(`    Trailer No ${jobTrailer} in extracted trucks? ${trailerMatch}`);
      }
      if (trailerMatch) {
        matchedFields.push({ field: 'Trailer Number', value: jobTrailer, score: 40 });
        totalScore += 40;
      }
    }

    // Check containerShipment (export - may contain container number)
    if ('containerShipment' in job && job.containerShipment) {
      const jobContainer = String(job.containerShipment);
      const containerMatch = extractedData.containerNumbers.some(
        c => c.replace(/\s/g, '').toUpperCase() === jobContainer.replace(/\s/g, '').toUpperCase()
      );
      if (debug) {
        console.log(`    Container Shipment ${jobContainer} in extracted? ${containerMatch}`);
      }
      if (containerMatch) {
        matchedFields.push({ field: 'Container Shipment', value: jobContainer, score: 40 });
        totalScore += 40;
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
          const similarity = this.stringSimilarity(c.toLowerCase(), customer.companyName.toLowerCase());
          return similarity > 0.6;
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
   * Calculate string similarity (simple implementation)
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
