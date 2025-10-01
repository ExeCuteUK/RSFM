import { 
  type User, 
  type InsertUser,
  type ImportCustomer,
  type InsertImportCustomer,
  type ExportCustomer,
  type InsertExportCustomer,
  type ExportReceiver,
  type InsertExportReceiver,
  type ImportShipment,
  type InsertImportShipment,
  type ExportShipment,
  type InsertExportShipment,
  type CustomClearance,
  type InsertCustomClearance
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Import Customer methods
  getAllImportCustomers(): Promise<ImportCustomer[]>;
  getImportCustomer(id: string): Promise<ImportCustomer | undefined>;
  createImportCustomer(customer: InsertImportCustomer): Promise<ImportCustomer>;
  updateImportCustomer(id: string, customer: Partial<InsertImportCustomer>): Promise<ImportCustomer | undefined>;
  deleteImportCustomer(id: string): Promise<boolean>;

  // Export Customer methods
  getAllExportCustomers(): Promise<ExportCustomer[]>;
  getExportCustomer(id: string): Promise<ExportCustomer | undefined>;
  createExportCustomer(customer: InsertExportCustomer): Promise<ExportCustomer>;
  updateExportCustomer(id: string, customer: Partial<InsertExportCustomer>): Promise<ExportCustomer | undefined>;
  deleteExportCustomer(id: string): Promise<boolean>;

  // Export Receiver methods
  getAllExportReceivers(): Promise<ExportReceiver[]>;
  getExportReceiver(id: string): Promise<ExportReceiver | undefined>;
  createExportReceiver(receiver: InsertExportReceiver): Promise<ExportReceiver>;
  updateExportReceiver(id: string, receiver: Partial<InsertExportReceiver>): Promise<ExportReceiver | undefined>;
  deleteExportReceiver(id: string): Promise<boolean>;

  // Job Reference methods
  getNextJobRef(): number;

  // Import Shipment methods
  getAllImportShipments(): Promise<ImportShipment[]>;
  getImportShipment(id: string): Promise<ImportShipment | undefined>;
  createImportShipment(shipment: InsertImportShipment): Promise<ImportShipment>;
  updateImportShipment(id: string, shipment: Partial<InsertImportShipment>): Promise<ImportShipment | undefined>;
  deleteImportShipment(id: string): Promise<boolean>;

  // Export Shipment methods
  getAllExportShipments(): Promise<ExportShipment[]>;
  getExportShipment(id: string): Promise<ExportShipment | undefined>;
  createExportShipment(shipment: InsertExportShipment): Promise<ExportShipment>;
  updateExportShipment(id: string, shipment: Partial<InsertExportShipment>): Promise<ExportShipment | undefined>;
  deleteExportShipment(id: string): Promise<boolean>;

  // Custom Clearance methods
  getAllCustomClearances(): Promise<CustomClearance[]>;
  getCustomClearance(id: string): Promise<CustomClearance | undefined>;
  createCustomClearance(clearance: InsertCustomClearance): Promise<CustomClearance>;
  updateCustomClearance(id: string, clearance: Partial<InsertCustomClearance>): Promise<CustomClearance | undefined>;
  deleteCustomClearance(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private importCustomers: Map<string, ImportCustomer>;
  private exportCustomers: Map<string, ExportCustomer>;
  private exportReceivers: Map<string, ExportReceiver>;
  private importShipments: Map<string, ImportShipment>;
  private exportShipments: Map<string, ExportShipment>;
  private customClearances: Map<string, CustomClearance>;
  private jobRefCounter: number;

  constructor() {
    this.users = new Map();
    this.importCustomers = new Map();
    this.exportCustomers = new Map();
    this.exportReceivers = new Map();
    this.importShipments = new Map();
    this.exportShipments = new Map();
    this.customClearances = new Map();
    this.jobRefCounter = 26001;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Import Customer methods
  async getAllImportCustomers(): Promise<ImportCustomer[]> {
    return Array.from(this.importCustomers.values());
  }

  async getImportCustomer(id: string): Promise<ImportCustomer | undefined> {
    return this.importCustomers.get(id);
  }

  async createImportCustomer(insertCustomer: InsertImportCustomer): Promise<ImportCustomer> {
    const id = randomUUID();
    const customer: ImportCustomer = { 
      ...insertCustomer, 
      id,
      contactName: insertCustomer.contactName ?? null,
      vatNumber: insertCustomer.vatNumber ?? null,
      telephone: insertCustomer.telephone ?? null,
      fax: insertCustomer.fax ?? null,
      email: insertCustomer.email ?? null,
      addressLine1: insertCustomer.addressLine1 ?? null,
      addressLine2: insertCustomer.addressLine2 ?? null,
      town: insertCustomer.town ?? null,
      county: insertCustomer.county ?? null,
      postcode: insertCustomer.postcode ?? null,
      country: insertCustomer.country ?? null,
      agentName: insertCustomer.agentName ?? null,
      agentContactName: insertCustomer.agentContactName ?? null,
      agentTelephone: insertCustomer.agentTelephone ?? null,
      agentFax: insertCustomer.agentFax ?? null,
      agentEmail: insertCustomer.agentEmail ?? null,
      agentAddressLine1: insertCustomer.agentAddressLine1 ?? null,
      agentAddressLine2: insertCustomer.agentAddressLine2 ?? null,
      agentTown: insertCustomer.agentTown ?? null,
      agentCounty: insertCustomer.agentCounty ?? null,
      agentPostcode: insertCustomer.agentPostcode ?? null,
      agentCountry: insertCustomer.agentCountry ?? null,
      rsProcessCustomsClearance: insertCustomer.rsProcessCustomsClearance ?? false,
      agentInDover: insertCustomer.agentInDover ?? null,
      vatDanAuthority: insertCustomer.vatDanAuthority ?? false,
      postponeVatPayment: insertCustomer.postponeVatPayment ?? false,
      clearanceAgentDetails: insertCustomer.clearanceAgentDetails ?? null,
      defaultDeliveryAddress: insertCustomer.defaultDeliveryAddress ?? null,
      defaultSuppliersName: insertCustomer.defaultSuppliersName ?? null,
      bookingInDetails: insertCustomer.bookingInDetails ?? null,
    };
    this.importCustomers.set(id, customer);
    return customer;
  }

  async updateImportCustomer(id: string, updates: Partial<InsertImportCustomer>): Promise<ImportCustomer | undefined> {
    const existing = this.importCustomers.get(id);
    if (!existing) return undefined;
    
    const normalized = {
      ...updates,
      contactName: updates.contactName !== undefined ? updates.contactName ?? null : existing.contactName,
      vatNumber: updates.vatNumber !== undefined ? updates.vatNumber ?? null : existing.vatNumber,
      telephone: updates.telephone !== undefined ? updates.telephone ?? null : existing.telephone,
      fax: updates.fax !== undefined ? updates.fax ?? null : existing.fax,
      email: updates.email !== undefined ? updates.email ?? null : existing.email,
      addressLine1: updates.addressLine1 !== undefined ? updates.addressLine1 ?? null : existing.addressLine1,
      addressLine2: updates.addressLine2 !== undefined ? updates.addressLine2 ?? null : existing.addressLine2,
      town: updates.town !== undefined ? updates.town ?? null : existing.town,
      county: updates.county !== undefined ? updates.county ?? null : existing.county,
      postcode: updates.postcode !== undefined ? updates.postcode ?? null : existing.postcode,
      country: updates.country !== undefined ? updates.country ?? null : existing.country,
      agentName: updates.agentName !== undefined ? updates.agentName ?? null : existing.agentName,
      agentContactName: updates.agentContactName !== undefined ? updates.agentContactName ?? null : existing.agentContactName,
      agentTelephone: updates.agentTelephone !== undefined ? updates.agentTelephone ?? null : existing.agentTelephone,
      agentFax: updates.agentFax !== undefined ? updates.agentFax ?? null : existing.agentFax,
      agentEmail: updates.agentEmail !== undefined ? updates.agentEmail ?? null : existing.agentEmail,
      agentAddressLine1: updates.agentAddressLine1 !== undefined ? updates.agentAddressLine1 ?? null : existing.agentAddressLine1,
      agentAddressLine2: updates.agentAddressLine2 !== undefined ? updates.agentAddressLine2 ?? null : existing.agentAddressLine2,
      agentTown: updates.agentTown !== undefined ? updates.agentTown ?? null : existing.agentTown,
      agentCounty: updates.agentCounty !== undefined ? updates.agentCounty ?? null : existing.agentCounty,
      agentPostcode: updates.agentPostcode !== undefined ? updates.agentPostcode ?? null : existing.agentPostcode,
      agentCountry: updates.agentCountry !== undefined ? updates.agentCountry ?? null : existing.agentCountry,
      rsProcessCustomsClearance: updates.rsProcessCustomsClearance !== undefined ? updates.rsProcessCustomsClearance ?? false : existing.rsProcessCustomsClearance,
      agentInDover: updates.agentInDover !== undefined ? updates.agentInDover ?? null : existing.agentInDover,
      vatDanAuthority: updates.vatDanAuthority !== undefined ? updates.vatDanAuthority ?? false : existing.vatDanAuthority,
      postponeVatPayment: updates.postponeVatPayment !== undefined ? updates.postponeVatPayment ?? false : existing.postponeVatPayment,
      clearanceAgentDetails: updates.clearanceAgentDetails !== undefined ? updates.clearanceAgentDetails ?? null : existing.clearanceAgentDetails,
      defaultDeliveryAddress: updates.defaultDeliveryAddress !== undefined ? updates.defaultDeliveryAddress ?? null : existing.defaultDeliveryAddress,
      defaultSuppliersName: updates.defaultSuppliersName !== undefined ? updates.defaultSuppliersName ?? null : existing.defaultSuppliersName,
      bookingInDetails: updates.bookingInDetails !== undefined ? updates.bookingInDetails ?? null : existing.bookingInDetails,
    };
    
    const updated: ImportCustomer = { ...existing, ...normalized };
    this.importCustomers.set(id, updated);
    return updated;
  }

  async deleteImportCustomer(id: string): Promise<boolean> {
    return this.importCustomers.delete(id);
  }

  // Export Customer methods
  async getAllExportCustomers(): Promise<ExportCustomer[]> {
    return Array.from(this.exportCustomers.values());
  }

  async getExportCustomer(id: string): Promise<ExportCustomer | undefined> {
    return this.exportCustomers.get(id);
  }

  async createExportCustomer(insertCustomer: InsertExportCustomer): Promise<ExportCustomer> {
    const id = randomUUID();
    const customer: ExportCustomer = { 
      ...insertCustomer, 
      id,
      contactName: insertCustomer.contactName ?? null,
      vatNumber: insertCustomer.vatNumber ?? null,
      telephone: insertCustomer.telephone ?? null,
      fax: insertCustomer.fax ?? null,
      email: insertCustomer.email ?? null,
      addressLine1: insertCustomer.addressLine1 ?? null,
      addressLine2: insertCustomer.addressLine2 ?? null,
      town: insertCustomer.town ?? null,
      county: insertCustomer.county ?? null,
      postcode: insertCustomer.postcode ?? null,
      country: insertCustomer.country ?? null,
      agentName: insertCustomer.agentName ?? null,
      agentContactName: insertCustomer.agentContactName ?? null,
      agentTelephone: insertCustomer.agentTelephone ?? null,
      agentFax: insertCustomer.agentFax ?? null,
      agentEmail: insertCustomer.agentEmail ?? null,
      agentAddressLine1: insertCustomer.agentAddressLine1 ?? null,
      agentAddressLine2: insertCustomer.agentAddressLine2 ?? null,
      agentTown: insertCustomer.agentTown ?? null,
      agentCounty: insertCustomer.agentCounty ?? null,
      agentPostcode: insertCustomer.agentPostcode ?? null,
      agentCountry: insertCustomer.agentCountry ?? null,
    };
    this.exportCustomers.set(id, customer);
    return customer;
  }

  async updateExportCustomer(id: string, updates: Partial<InsertExportCustomer>): Promise<ExportCustomer | undefined> {
    const existing = this.exportCustomers.get(id);
    if (!existing) return undefined;
    
    const normalized = {
      ...updates,
      contactName: updates.contactName !== undefined ? updates.contactName ?? null : existing.contactName,
      vatNumber: updates.vatNumber !== undefined ? updates.vatNumber ?? null : existing.vatNumber,
      telephone: updates.telephone !== undefined ? updates.telephone ?? null : existing.telephone,
      fax: updates.fax !== undefined ? updates.fax ?? null : existing.fax,
      email: updates.email !== undefined ? updates.email ?? null : existing.email,
      addressLine1: updates.addressLine1 !== undefined ? updates.addressLine1 ?? null : existing.addressLine1,
      addressLine2: updates.addressLine2 !== undefined ? updates.addressLine2 ?? null : existing.addressLine2,
      town: updates.town !== undefined ? updates.town ?? null : existing.town,
      county: updates.county !== undefined ? updates.county ?? null : existing.county,
      postcode: updates.postcode !== undefined ? updates.postcode ?? null : existing.postcode,
      country: updates.country !== undefined ? updates.country ?? null : existing.country,
      agentName: updates.agentName !== undefined ? updates.agentName ?? null : existing.agentName,
      agentContactName: updates.agentContactName !== undefined ? updates.agentContactName ?? null : existing.agentContactName,
      agentTelephone: updates.agentTelephone !== undefined ? updates.agentTelephone ?? null : existing.agentTelephone,
      agentFax: updates.agentFax !== undefined ? updates.agentFax ?? null : existing.agentFax,
      agentEmail: updates.agentEmail !== undefined ? updates.agentEmail ?? null : existing.agentEmail,
      agentAddressLine1: updates.agentAddressLine1 !== undefined ? updates.agentAddressLine1 ?? null : existing.agentAddressLine1,
      agentAddressLine2: updates.agentAddressLine2 !== undefined ? updates.agentAddressLine2 ?? null : existing.agentAddressLine2,
      agentTown: updates.agentTown !== undefined ? updates.agentTown ?? null : existing.agentTown,
      agentCounty: updates.agentCounty !== undefined ? updates.agentCounty ?? null : existing.agentCounty,
      agentPostcode: updates.agentPostcode !== undefined ? updates.agentPostcode ?? null : existing.agentPostcode,
      agentCountry: updates.agentCountry !== undefined ? updates.agentCountry ?? null : existing.agentCountry,
    };
    
    const updated: ExportCustomer = { ...existing, ...normalized };
    this.exportCustomers.set(id, updated);
    return updated;
  }

  async deleteExportCustomer(id: string): Promise<boolean> {
    return this.exportCustomers.delete(id);
  }

  // Export Receiver methods
  async getAllExportReceivers(): Promise<ExportReceiver[]> {
    return Array.from(this.exportReceivers.values());
  }

  async getExportReceiver(id: string): Promise<ExportReceiver | undefined> {
    return this.exportReceivers.get(id);
  }

  async createExportReceiver(insertReceiver: InsertExportReceiver): Promise<ExportReceiver> {
    const id = randomUUID();
    const receiver: ExportReceiver = { 
      ...insertReceiver, 
      id,
      addressLine1: insertReceiver.addressLine1 ?? null,
      addressLine2: insertReceiver.addressLine2 ?? null,
      town: insertReceiver.town ?? null,
      county: insertReceiver.county ?? null,
      postcode: insertReceiver.postcode ?? null,
      country: insertReceiver.country ?? null,
    };
    this.exportReceivers.set(id, receiver);
    return receiver;
  }

  async updateExportReceiver(id: string, updates: Partial<InsertExportReceiver>): Promise<ExportReceiver | undefined> {
    const existing = this.exportReceivers.get(id);
    if (!existing) return undefined;
    
    const normalized = {
      ...updates,
      addressLine1: updates.addressLine1 !== undefined ? updates.addressLine1 ?? null : existing.addressLine1,
      addressLine2: updates.addressLine2 !== undefined ? updates.addressLine2 ?? null : existing.addressLine2,
      town: updates.town !== undefined ? updates.town ?? null : existing.town,
      county: updates.county !== undefined ? updates.county ?? null : existing.county,
      postcode: updates.postcode !== undefined ? updates.postcode ?? null : existing.postcode,
      country: updates.country !== undefined ? updates.country ?? null : existing.country,
    };
    
    const updated: ExportReceiver = { ...existing, ...normalized };
    this.exportReceivers.set(id, updated);
    return updated;
  }

  async deleteExportReceiver(id: string): Promise<boolean> {
    return this.exportReceivers.delete(id);
  }

  // Job Reference methods
  getNextJobRef(): number {
    return this.jobRefCounter++;
  }

  // Import Shipment methods
  async getAllImportShipments(): Promise<ImportShipment[]> {
    return Array.from(this.importShipments.values());
  }

  async getImportShipment(id: string): Promise<ImportShipment | undefined> {
    return this.importShipments.get(id);
  }

  async createImportShipment(insertShipment: InsertImportShipment): Promise<ImportShipment> {
    const id = randomUUID();
    const jobRef = this.getNextJobRef();
    
    const shipment: ImportShipment = {
      ...insertShipment,
      id,
      jobRef,
      jobType: "import",
      createdAt: new Date().toISOString(),
      status: insertShipment.status ?? "Pending",
      importCustomerId: insertShipment.importCustomerId ?? null,
      importDateEtaPort: insertShipment.importDateEtaPort ?? null,
      portOfArrival: insertShipment.portOfArrival ?? null,
      trailerOrContainerNumber: insertShipment.trailerOrContainerNumber ?? null,
      departureCountry: insertShipment.departureCountry ?? null,
      containerShipment: insertShipment.containerShipment ?? false,
      vesselName: insertShipment.vesselName ?? null,
      numberOfPieces: insertShipment.numberOfPieces ?? null,
      packaging: insertShipment.packaging ?? null,
      weight: insertShipment.weight ?? null,
      cube: insertShipment.cube ?? null,
      goodsDescription: insertShipment.goodsDescription ?? null,
      invoiceValue: insertShipment.invoiceValue ?? null,
      freightCharge: insertShipment.freightCharge ?? null,
      clearanceCharge: insertShipment.clearanceCharge ?? null,
      currency: insertShipment.currency ?? null,
      additionalCommodityCodes: insertShipment.additionalCommodityCodes ?? null,
      vatZeroRated: insertShipment.vatZeroRated ?? false,
      clearanceType: insertShipment.clearanceType ?? null,
      customsClearanceAgent: insertShipment.customsClearanceAgent ?? null,
      rsToClear: insertShipment.rsToClear ?? false,
      customerReferenceNumber: insertShipment.customerReferenceNumber ?? null,
      deliveryAddress: insertShipment.deliveryAddress ?? null,
      supplierName: insertShipment.supplierName ?? null,
      attachments: insertShipment.attachments ?? null,
      linkedClearanceId: null,
    };

    this.importShipments.set(id, shipment);

    if (shipment.rsToClear) {
      const clearanceId = randomUUID();
      const clearance: CustomClearance = {
        id: clearanceId,
        jobRef: shipment.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Waiting Entry",
        importCustomerId: shipment.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: shipment.importDateEtaPort,
        portOfArrival: shipment.portOfArrival,
        trailerOrContainerNumber: shipment.trailerOrContainerNumber,
        departureFrom: shipment.departureCountry,
        containerShipment: shipment.containerShipment,
        vesselName: shipment.vesselName,
        numberOfPieces: shipment.numberOfPieces,
        packaging: shipment.packaging,
        weight: shipment.weight,
        cube: shipment.cube,
        goodsDescription: shipment.goodsDescription,
        invoiceValue: shipment.invoiceValue,
        transportCosts: shipment.freightCharge,
        clearanceCharge: shipment.clearanceCharge,
        currency: shipment.currency,
        additionalCommodityCodes: shipment.additionalCommodityCodes,
        vatZeroRated: shipment.vatZeroRated,
        clearanceType: shipment.clearanceType,
        incoterms: null,
        customerReferenceNumber: shipment.customerReferenceNumber,
        supplierName: shipment.supplierName,
        attachments: null,
        createdFromType: "import",
        createdFromId: shipment.id,
      };

      this.customClearances.set(clearanceId, clearance);
      
      shipment.linkedClearanceId = clearanceId;
      this.importShipments.set(id, shipment);
    }

    return shipment;
  }

  async updateImportShipment(id: string, updates: Partial<InsertImportShipment>): Promise<ImportShipment | undefined> {
    const existing = this.importShipments.get(id);
    if (!existing) return undefined;

    const updated: ImportShipment = { 
      ...existing, 
      ...updates,
      status: updates.status !== undefined ? updates.status ?? "Pending" : existing.status,
      importCustomerId: updates.importCustomerId !== undefined ? updates.importCustomerId ?? null : existing.importCustomerId,
      importDateEtaPort: updates.importDateEtaPort !== undefined ? updates.importDateEtaPort ?? null : existing.importDateEtaPort,
      portOfArrival: updates.portOfArrival !== undefined ? updates.portOfArrival ?? null : existing.portOfArrival,
      trailerOrContainerNumber: updates.trailerOrContainerNumber !== undefined ? updates.trailerOrContainerNumber ?? null : existing.trailerOrContainerNumber,
      departureCountry: updates.departureCountry !== undefined ? updates.departureCountry ?? null : existing.departureCountry,
      containerShipment: updates.containerShipment !== undefined ? updates.containerShipment ?? false : existing.containerShipment,
      vesselName: updates.vesselName !== undefined ? updates.vesselName ?? null : existing.vesselName,
      numberOfPieces: updates.numberOfPieces !== undefined ? updates.numberOfPieces ?? null : existing.numberOfPieces,
      packaging: updates.packaging !== undefined ? updates.packaging ?? null : existing.packaging,
      weight: updates.weight !== undefined ? updates.weight ?? null : existing.weight,
      cube: updates.cube !== undefined ? updates.cube ?? null : existing.cube,
      goodsDescription: updates.goodsDescription !== undefined ? updates.goodsDescription ?? null : existing.goodsDescription,
      invoiceValue: updates.invoiceValue !== undefined ? updates.invoiceValue ?? null : existing.invoiceValue,
      freightCharge: updates.freightCharge !== undefined ? updates.freightCharge ?? null : existing.freightCharge,
      clearanceCharge: updates.clearanceCharge !== undefined ? updates.clearanceCharge ?? null : existing.clearanceCharge,
      currency: updates.currency !== undefined ? updates.currency ?? null : existing.currency,
      additionalCommodityCodes: updates.additionalCommodityCodes !== undefined ? updates.additionalCommodityCodes ?? null : existing.additionalCommodityCodes,
      vatZeroRated: updates.vatZeroRated !== undefined ? updates.vatZeroRated ?? false : existing.vatZeroRated,
      clearanceType: updates.clearanceType !== undefined ? updates.clearanceType ?? null : existing.clearanceType,
      customsClearanceAgent: updates.customsClearanceAgent !== undefined ? updates.customsClearanceAgent ?? null : existing.customsClearanceAgent,
      rsToClear: updates.rsToClear !== undefined ? updates.rsToClear ?? false : existing.rsToClear,
      customerReferenceNumber: updates.customerReferenceNumber !== undefined ? updates.customerReferenceNumber ?? null : existing.customerReferenceNumber,
      deliveryAddress: updates.deliveryAddress !== undefined ? updates.deliveryAddress ?? null : existing.deliveryAddress,
      supplierName: updates.supplierName !== undefined ? updates.supplierName ?? null : existing.supplierName,
      attachments: updates.attachments !== undefined ? updates.attachments ?? null : existing.attachments,
    };
    
    this.importShipments.set(id, updated);
    return updated;
  }

  async deleteImportShipment(id: string): Promise<boolean> {
    return this.importShipments.delete(id);
  }

  // Export Shipment methods
  async getAllExportShipments(): Promise<ExportShipment[]> {
    return Array.from(this.exportShipments.values());
  }

  async getExportShipment(id: string): Promise<ExportShipment | undefined> {
    return this.exportShipments.get(id);
  }

  async createExportShipment(insertShipment: InsertExportShipment): Promise<ExportShipment> {
    const id = randomUUID();
    const jobRef = this.getNextJobRef();
    
    const shipment: ExportShipment = {
      ...insertShipment,
      id,
      jobRef,
      jobType: "export",
      createdAt: new Date().toISOString(),
      status: insertShipment.status ?? "Pending",
      receiverId: insertShipment.receiverId ?? null,
      destinationCustomerId: insertShipment.destinationCustomerId ?? null,
      customerReferenceNumber: insertShipment.customerReferenceNumber ?? null,
      loadDate: insertShipment.loadDate ?? null,
      trailerNo: insertShipment.trailerNo ?? null,
      departureFrom: insertShipment.departureFrom ?? null,
      portOfArrival: insertShipment.portOfArrival ?? null,
      incoterms: insertShipment.incoterms ?? null,
      exportClearanceAgent: insertShipment.exportClearanceAgent,
      arrivalClearanceAgent: insertShipment.arrivalClearanceAgent,
      supplier: insertShipment.supplier ?? null,
      consignee: insertShipment.consignee ?? null,
      value: insertShipment.value ?? null,
      numberOfPieces: insertShipment.numberOfPieces ?? null,
      packaging: insertShipment.packaging ?? null,
      goodsDescription: insertShipment.goodsDescription ?? null,
      weight: insertShipment.weight ?? null,
      cube: insertShipment.cube ?? null,
      freightRateOut: insertShipment.freightRateOut ?? null,
      clearanceCharge: insertShipment.clearanceCharge ?? null,
      arrivalClearanceCost: insertShipment.arrivalClearanceCost ?? null,
      currency: insertShipment.currency ?? null,
      additionalCommodityCodes: insertShipment.additionalCommodityCodes ?? null,
      haulierName: insertShipment.haulierName ?? null,
      haulierContactName: insertShipment.haulierContactName ?? null,
      attachments: insertShipment.attachments ?? null,
    };

    this.exportShipments.set(id, shipment);
    return shipment;
  }

  async updateExportShipment(id: string, updates: Partial<InsertExportShipment>): Promise<ExportShipment | undefined> {
    const existing = this.exportShipments.get(id);
    if (!existing) return undefined;

    const updated: ExportShipment = { 
      ...existing, 
      ...updates,
      status: updates.status !== undefined ? updates.status ?? "Pending" : existing.status,
      receiverId: updates.receiverId !== undefined ? updates.receiverId ?? null : existing.receiverId,
      destinationCustomerId: updates.destinationCustomerId !== undefined ? updates.destinationCustomerId ?? null : existing.destinationCustomerId,
      customerReferenceNumber: updates.customerReferenceNumber !== undefined ? updates.customerReferenceNumber ?? null : existing.customerReferenceNumber,
      loadDate: updates.loadDate !== undefined ? updates.loadDate ?? null : existing.loadDate,
      trailerNo: updates.trailerNo !== undefined ? updates.trailerNo ?? null : existing.trailerNo,
      departureFrom: updates.departureFrom !== undefined ? updates.departureFrom ?? null : existing.departureFrom,
      portOfArrival: updates.portOfArrival !== undefined ? updates.portOfArrival ?? null : existing.portOfArrival,
      incoterms: updates.incoterms !== undefined ? updates.incoterms ?? null : existing.incoterms,
      exportClearanceAgent: updates.exportClearanceAgent !== undefined ? updates.exportClearanceAgent : existing.exportClearanceAgent,
      arrivalClearanceAgent: updates.arrivalClearanceAgent !== undefined ? updates.arrivalClearanceAgent : existing.arrivalClearanceAgent,
      supplier: updates.supplier !== undefined ? updates.supplier ?? null : existing.supplier,
      consignee: updates.consignee !== undefined ? updates.consignee ?? null : existing.consignee,
      value: updates.value !== undefined ? updates.value ?? null : existing.value,
      numberOfPieces: updates.numberOfPieces !== undefined ? updates.numberOfPieces ?? null : existing.numberOfPieces,
      packaging: updates.packaging !== undefined ? updates.packaging ?? null : existing.packaging,
      goodsDescription: updates.goodsDescription !== undefined ? updates.goodsDescription ?? null : existing.goodsDescription,
      weight: updates.weight !== undefined ? updates.weight ?? null : existing.weight,
      cube: updates.cube !== undefined ? updates.cube ?? null : existing.cube,
      freightRateOut: updates.freightRateOut !== undefined ? updates.freightRateOut ?? null : existing.freightRateOut,
      clearanceCharge: updates.clearanceCharge !== undefined ? updates.clearanceCharge ?? null : existing.clearanceCharge,
      arrivalClearanceCost: updates.arrivalClearanceCost !== undefined ? updates.arrivalClearanceCost ?? null : existing.arrivalClearanceCost,
      currency: updates.currency !== undefined ? updates.currency ?? null : existing.currency,
      additionalCommodityCodes: updates.additionalCommodityCodes !== undefined ? updates.additionalCommodityCodes ?? null : existing.additionalCommodityCodes,
      haulierName: updates.haulierName !== undefined ? updates.haulierName ?? null : existing.haulierName,
      haulierContactName: updates.haulierContactName !== undefined ? updates.haulierContactName ?? null : existing.haulierContactName,
      attachments: updates.attachments !== undefined ? updates.attachments ?? null : existing.attachments,
    };
    
    this.exportShipments.set(id, updated);
    return updated;
  }

  async deleteExportShipment(id: string): Promise<boolean> {
    return this.exportShipments.delete(id);
  }

  // Custom Clearance methods
  async getAllCustomClearances(): Promise<CustomClearance[]> {
    return Array.from(this.customClearances.values());
  }

  async getCustomClearance(id: string): Promise<CustomClearance | undefined> {
    return this.customClearances.get(id);
  }

  async createCustomClearance(insertClearance: InsertCustomClearance): Promise<CustomClearance> {
    const id = randomUUID();
    const jobRef = this.getNextJobRef();
    
    const clearance: CustomClearance = {
      ...insertClearance,
      id,
      jobRef,
      createdAt: new Date().toISOString(),
      status: insertClearance.status ?? "Waiting Entry",
      importCustomerId: insertClearance.importCustomerId ?? null,
      exportCustomerId: insertClearance.exportCustomerId ?? null,
      receiverId: insertClearance.receiverId ?? null,
      etaPort: insertClearance.etaPort ?? null,
      portOfArrival: insertClearance.portOfArrival ?? null,
      trailerOrContainerNumber: insertClearance.trailerOrContainerNumber ?? null,
      departureFrom: insertClearance.departureFrom ?? null,
      containerShipment: insertClearance.containerShipment ?? false,
      vesselName: insertClearance.vesselName ?? null,
      numberOfPieces: insertClearance.numberOfPieces ?? null,
      packaging: insertClearance.packaging ?? null,
      weight: insertClearance.weight ?? null,
      cube: insertClearance.cube ?? null,
      goodsDescription: insertClearance.goodsDescription ?? null,
      invoiceValue: insertClearance.invoiceValue ?? null,
      transportCosts: insertClearance.transportCosts ?? null,
      clearanceCharge: insertClearance.clearanceCharge ?? null,
      currency: insertClearance.currency ?? null,
      additionalCommodityCodes: insertClearance.additionalCommodityCodes ?? null,
      vatZeroRated: insertClearance.vatZeroRated ?? false,
      clearanceType: insertClearance.clearanceType ?? null,
      incoterms: insertClearance.incoterms ?? null,
      customerReferenceNumber: insertClearance.customerReferenceNumber ?? null,
      supplierName: insertClearance.supplierName ?? null,
      attachments: insertClearance.attachments ?? null,
      createdFromType: insertClearance.createdFromType ?? null,
      createdFromId: insertClearance.createdFromId ?? null,
    };

    this.customClearances.set(id, clearance);
    return clearance;
  }

  async updateCustomClearance(id: string, updates: Partial<InsertCustomClearance>): Promise<CustomClearance | undefined> {
    const existing = this.customClearances.get(id);
    if (!existing) return undefined;

    const updated: CustomClearance = { 
      ...existing, 
      ...updates,
      status: updates.status !== undefined ? updates.status ?? "Waiting Entry" : existing.status,
      importCustomerId: updates.importCustomerId !== undefined ? updates.importCustomerId ?? null : existing.importCustomerId,
      exportCustomerId: updates.exportCustomerId !== undefined ? updates.exportCustomerId ?? null : existing.exportCustomerId,
      receiverId: updates.receiverId !== undefined ? updates.receiverId ?? null : existing.receiverId,
      etaPort: updates.etaPort !== undefined ? updates.etaPort ?? null : existing.etaPort,
      portOfArrival: updates.portOfArrival !== undefined ? updates.portOfArrival ?? null : existing.portOfArrival,
      trailerOrContainerNumber: updates.trailerOrContainerNumber !== undefined ? updates.trailerOrContainerNumber ?? null : existing.trailerOrContainerNumber,
      departureFrom: updates.departureFrom !== undefined ? updates.departureFrom ?? null : existing.departureFrom,
      containerShipment: updates.containerShipment !== undefined ? updates.containerShipment ?? false : existing.containerShipment,
      vesselName: updates.vesselName !== undefined ? updates.vesselName ?? null : existing.vesselName,
      numberOfPieces: updates.numberOfPieces !== undefined ? updates.numberOfPieces ?? null : existing.numberOfPieces,
      packaging: updates.packaging !== undefined ? updates.packaging ?? null : existing.packaging,
      weight: updates.weight !== undefined ? updates.weight ?? null : existing.weight,
      cube: updates.cube !== undefined ? updates.cube ?? null : existing.cube,
      goodsDescription: updates.goodsDescription !== undefined ? updates.goodsDescription ?? null : existing.goodsDescription,
      invoiceValue: updates.invoiceValue !== undefined ? updates.invoiceValue ?? null : existing.invoiceValue,
      transportCosts: updates.transportCosts !== undefined ? updates.transportCosts ?? null : existing.transportCosts,
      clearanceCharge: updates.clearanceCharge !== undefined ? updates.clearanceCharge ?? null : existing.clearanceCharge,
      currency: updates.currency !== undefined ? updates.currency ?? null : existing.currency,
      additionalCommodityCodes: updates.additionalCommodityCodes !== undefined ? updates.additionalCommodityCodes ?? null : existing.additionalCommodityCodes,
      vatZeroRated: updates.vatZeroRated !== undefined ? updates.vatZeroRated ?? false : existing.vatZeroRated,
      clearanceType: updates.clearanceType !== undefined ? updates.clearanceType ?? null : existing.clearanceType,
      incoterms: updates.incoterms !== undefined ? updates.incoterms ?? null : existing.incoterms,
      customerReferenceNumber: updates.customerReferenceNumber !== undefined ? updates.customerReferenceNumber ?? null : existing.customerReferenceNumber,
      supplierName: updates.supplierName !== undefined ? updates.supplierName ?? null : existing.supplierName,
      attachments: updates.attachments !== undefined ? updates.attachments ?? null : existing.attachments,
      createdFromType: updates.createdFromType !== undefined ? updates.createdFromType ?? null : existing.createdFromType,
      createdFromId: updates.createdFromId !== undefined ? updates.createdFromId ?? null : existing.createdFromId,
    };
    
    this.customClearances.set(id, updated);
    return updated;
  }

  async deleteCustomClearance(id: string): Promise<boolean> {
    return this.customClearances.delete(id);
  }
}

export const storage = new MemStorage();