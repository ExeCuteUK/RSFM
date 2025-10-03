import { 
  type User, 
  type InsertUser,
  type ImportCustomer,
  type InsertImportCustomer,
  type ExportCustomer,
  type InsertExportCustomer,
  type ExportReceiver,
  type InsertExportReceiver,
  type Haulier,
  type InsertHaulier,
  type ShippingLine,
  type InsertShippingLine,
  type ClearanceAgent,
  type InsertClearanceAgent,
  type Settings,
  type InsertSettings,
  type ImportShipment,
  type InsertImportShipment,
  type ExportShipment,
  type InsertExportShipment,
  type CustomClearance,
  type InsertCustomClearance,
  importCustomers,
  exportCustomers,
  exportReceivers,
  hauliers,
  shippingLines,
  clearanceAgents,
  settings,
  importShipments,
  exportShipments,
  customClearances,
  users
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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

  // Haulier methods
  getAllHauliers(): Promise<Haulier[]>;
  getHaulier(id: string): Promise<Haulier | undefined>;
  createHaulier(haulier: InsertHaulier): Promise<Haulier>;
  updateHaulier(id: string, haulier: Partial<InsertHaulier>): Promise<Haulier | undefined>;
  deleteHaulier(id: string): Promise<boolean>;

  // Shipping Line methods
  getAllShippingLines(): Promise<ShippingLine[]>;
  getShippingLine(id: string): Promise<ShippingLine | undefined>;
  createShippingLine(shippingLine: InsertShippingLine): Promise<ShippingLine>;
  updateShippingLine(id: string, shippingLine: Partial<InsertShippingLine>): Promise<ShippingLine | undefined>;
  deleteShippingLine(id: string): Promise<boolean>;

  // Clearance Agent methods
  getAllClearanceAgents(): Promise<ClearanceAgent[]>;
  getClearanceAgent(id: string): Promise<ClearanceAgent | undefined>;
  createClearanceAgent(agent: InsertClearanceAgent): Promise<ClearanceAgent>;
  updateClearanceAgent(id: string, agent: Partial<InsertClearanceAgent>): Promise<ClearanceAgent | undefined>;
  deleteClearanceAgent(id: string): Promise<boolean>;

  // Settings methods
  getSettings(): Promise<Settings | undefined>;
  updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<Settings | undefined>;
  createSettings(settingsData: InsertSettings): Promise<Settings>;

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
      vatPaymentMethod: insertCustomer.vatPaymentMethod ?? null,
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
      vatPaymentMethod: updates.vatPaymentMethod !== undefined ? updates.vatPaymentMethod ?? null : existing.vatPaymentMethod,
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

  // Haulier methods
  async getAllHauliers(): Promise<Haulier[]> {
    return [];
  }

  async getHaulier(id: string): Promise<Haulier | undefined> {
    return undefined;
  }

  async createHaulier(haulier: InsertHaulier): Promise<Haulier> {
    const id = randomUUID();
    const created: Haulier = {
      ...haulier,
      id,
      homeCountry: haulier.homeCountry ?? null,
      address: haulier.address ?? null,
      telephone: haulier.telephone ?? null,
      mobile: haulier.mobile ?? null,
      email: haulier.email ?? null,
      destinationCountries: haulier.destinationCountries ?? null,
    };
    return created;
  }

  async updateHaulier(id: string, haulier: Partial<InsertHaulier>): Promise<Haulier | undefined> {
    return undefined;
  }

  async deleteHaulier(id: string): Promise<boolean> {
    return false;
  }

  // Shipping Line methods
  async getAllShippingLines(): Promise<ShippingLine[]> {
    return [];
  }

  async getShippingLine(id: string): Promise<ShippingLine | undefined> {
    return undefined;
  }

  async createShippingLine(shippingLine: InsertShippingLine): Promise<ShippingLine> {
    const created: ShippingLine = {
      id: randomUUID(),
      shippingLineName: shippingLine.shippingLineName,
      shippingLineAddress: shippingLine.shippingLineAddress ?? null,
      telephone: shippingLine.telephone ?? null,
      importEmail: shippingLine.importEmail ?? null,
      exportEmail: shippingLine.exportEmail ?? null,
      releasesEmail: shippingLine.releasesEmail ?? null,
      accountingEmail: shippingLine.accountingEmail ?? null,
    };
    return created;
  }

  async updateShippingLine(id: string, shippingLine: Partial<InsertShippingLine>): Promise<ShippingLine | undefined> {
    return undefined;
  }

  async deleteShippingLine(id: string): Promise<boolean> {
    return false;
  }

  // Clearance Agent methods
  async getAllClearanceAgents(): Promise<ClearanceAgent[]> {
    return [];
  }

  async getClearanceAgent(id: string): Promise<ClearanceAgent | undefined> {
    return undefined;
  }

  async createClearanceAgent(agent: InsertClearanceAgent): Promise<ClearanceAgent> {
    const created: ClearanceAgent = {
      id: randomUUID(),
      agentName: agent.agentName,
      agentTelephone: agent.agentTelephone ?? null,
      agentImportEmail: agent.agentImportEmail ?? null,
      agentExportEmail: agent.agentExportEmail ?? null,
      agentAccountingEmail: agent.agentAccountingEmail ?? null,
    };
    return created;
  }

  async updateClearanceAgent(id: string, agent: Partial<InsertClearanceAgent>): Promise<ClearanceAgent | undefined> {
    return undefined;
  }

  async deleteClearanceAgent(id: string): Promise<boolean> {
    return false;
  }

  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    return undefined;
  }

  async updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<Settings | undefined> {
    return undefined;
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const created: Settings = {
      id: randomUUID(),
      importClearanceFee: settingsData.importClearanceFee ?? null,
      inventoryLinkedFee: settingsData.inventoryLinkedFee ?? null,
      commodityCodesIncludedFree: settingsData.commodityCodesIncludedFree ?? null,
      additionalCommodityCodeCharge: settingsData.additionalCommodityCodeCharge ?? null,
      defermentChargeMinimum: settingsData.defermentChargeMinimum ?? null,
      defermentChargePercentage: settingsData.defermentChargePercentage ?? null,
      handoverFee: settingsData.handoverFee ?? null,
    };
    return created;
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
      incoterms: insertShipment.incoterms ?? null,
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
        status: "Awaiting Entry",
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

    // If rsToClear is being changed from true to false, delete the linked clearance
    if (existing.rsToClear && updates.rsToClear === false && existing.linkedClearanceId) {
      this.customClearances.delete(existing.linkedClearanceId);
      updates.linkedClearanceId = null;
    }

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
      incoterms: updates.incoterms !== undefined ? updates.incoterms ?? null : existing.incoterms,
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

    // If rsToClear is true and there's no linked clearance, create one
    if (updated.rsToClear === true && !existing.linkedClearanceId) {
      const clearanceId = randomUUID();
      const clearance: CustomClearance = {
        id: clearanceId,
        jobRef: existing.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: updated.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: updated.importDateEtaPort,
        portOfArrival: updated.portOfArrival,
        trailerOrContainerNumber: updated.trailerOrContainerNumber,
        departureFrom: updated.departureCountry,
        containerShipment: updated.containerShipment,
        vesselName: updated.vesselName,
        numberOfPieces: updated.numberOfPieces,
        packaging: updated.packaging,
        weight: updated.weight,
        cube: updated.cube,
        goodsDescription: updated.goodsDescription,
        invoiceValue: updated.invoiceValue,
        transportCosts: updated.freightCharge,
        clearanceCharge: updated.clearanceCharge,
        currency: updated.currency,
        additionalCommodityCodes: updated.additionalCommodityCodes,
        vatZeroRated: updated.vatZeroRated,
        clearanceType: updated.clearanceType,
        incoterms: null,
        customerReferenceNumber: updated.customerReferenceNumber,
        supplierName: updated.supplierName,
        attachments: null,
        createdFromType: "import",
        createdFromId: existing.id,
        deliveryAddress: null,
        shippingLine: null,
        additionalCommodityCodeCharge: null,
        dutiesAndVat: null,
        customsOfficerName: null,
        customsClearanceCharge: null,
        entryNumber: null,
        additionalNotes: null,
        localImpChargesIn: null,
        localImpChargesOut: null,
        clearanceStatusBooked: 0,
        deliveryBooked: 0,
      };

      this.customClearances.set(clearanceId, clearance);
      updated.linkedClearanceId = clearanceId;
    }
    
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
      containerShipment: insertShipment.containerShipment ?? false,
      vesselName: insertShipment.vesselName ?? null,
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
      linkedClearanceId: insertShipment.linkedClearanceId ?? null,
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
      containerShipment: updates.containerShipment !== undefined ? updates.containerShipment ?? false : existing.containerShipment,
      vesselName: updates.vesselName !== undefined ? updates.vesselName ?? null : existing.vesselName,
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
      linkedClearanceId: updates.linkedClearanceId !== undefined ? updates.linkedClearanceId ?? null : existing.linkedClearanceId,
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
      status: insertClearance.status ?? "Awaiting Entry",
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
      status: updates.status !== undefined ? updates.status ?? "Awaiting Entry" : existing.status,
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

// Database Storage Implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  private jobRefCounter: number = 26001;
  private initialized: boolean = false;

  private async initialize() {
    if (this.initialized) return;
    
    // Get the maximum job ref from all tables
    const [maxImport] = await db.select({ max: sql<number>`MAX(${importShipments.jobRef})` }).from(importShipments);
    const [maxExport] = await db.select({ max: sql<number>`MAX(${exportShipments.jobRef})` }).from(exportShipments);
    const [maxClearance] = await db.select({ max: sql<number>`MAX(${customClearances.jobRef})` }).from(customClearances);
    
    const currentMax = Math.max(
      maxImport.max || 26000,
      maxExport.max || 26000,
      maxClearance.max || 26000
    );
    
    this.jobRefCounter = currentMax + 1;
    this.initialized = true;
  }

  getNextJobRef(): number {
    return this.jobRefCounter++;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  // Import Customer methods
  async getAllImportCustomers(): Promise<ImportCustomer[]> {
    return await db.select().from(importCustomers);
  }

  async getImportCustomer(id: string): Promise<ImportCustomer | undefined> {
    const [customer] = await db.select().from(importCustomers).where(eq(importCustomers.id, id));
    return customer;
  }

  async createImportCustomer(customer: InsertImportCustomer): Promise<ImportCustomer> {
    const [created] = await db.insert(importCustomers).values(customer).returning();
    return created;
  }

  async updateImportCustomer(id: string, customer: Partial<InsertImportCustomer>): Promise<ImportCustomer | undefined> {
    const [updated] = await db.update(importCustomers).set(customer).where(eq(importCustomers.id, id)).returning();
    return updated;
  }

  async deleteImportCustomer(id: string): Promise<boolean> {
    const result = await db.delete(importCustomers).where(eq(importCustomers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Export Customer methods
  async getAllExportCustomers(): Promise<ExportCustomer[]> {
    return await db.select().from(exportCustomers);
  }

  async getExportCustomer(id: string): Promise<ExportCustomer | undefined> {
    const [customer] = await db.select().from(exportCustomers).where(eq(exportCustomers.id, id));
    return customer;
  }

  async createExportCustomer(customer: InsertExportCustomer): Promise<ExportCustomer> {
    const [created] = await db.insert(exportCustomers).values(customer).returning();
    return created;
  }

  async updateExportCustomer(id: string, customer: Partial<InsertExportCustomer>): Promise<ExportCustomer | undefined> {
    const [updated] = await db.update(exportCustomers).set(customer).where(eq(exportCustomers.id, id)).returning();
    return updated;
  }

  async deleteExportCustomer(id: string): Promise<boolean> {
    const result = await db.delete(exportCustomers).where(eq(exportCustomers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Export Receiver methods
  async getAllExportReceivers(): Promise<ExportReceiver[]> {
    return await db.select().from(exportReceivers);
  }

  async getExportReceiver(id: string): Promise<ExportReceiver | undefined> {
    const [receiver] = await db.select().from(exportReceivers).where(eq(exportReceivers.id, id));
    return receiver;
  }

  async createExportReceiver(receiver: InsertExportReceiver): Promise<ExportReceiver> {
    const [created] = await db.insert(exportReceivers).values(receiver).returning();
    return created;
  }

  async updateExportReceiver(id: string, receiver: Partial<InsertExportReceiver>): Promise<ExportReceiver | undefined> {
    const [updated] = await db.update(exportReceivers).set(receiver).where(eq(exportReceivers.id, id)).returning();
    return updated;
  }

  async deleteExportReceiver(id: string): Promise<boolean> {
    const result = await db.delete(exportReceivers).where(eq(exportReceivers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Haulier methods
  async getAllHauliers(): Promise<Haulier[]> {
    return await db.select().from(hauliers);
  }

  async getHaulier(id: string): Promise<Haulier | undefined> {
    const [haulier] = await db.select().from(hauliers).where(eq(hauliers.id, id));
    return haulier;
  }

  async createHaulier(haulier: InsertHaulier): Promise<Haulier> {
    const [created] = await db.insert(hauliers).values(haulier).returning();
    return created;
  }

  async updateHaulier(id: string, haulier: Partial<InsertHaulier>): Promise<Haulier | undefined> {
    const [updated] = await db.update(hauliers).set(haulier).where(eq(hauliers.id, id)).returning();
    return updated;
  }

  async deleteHaulier(id: string): Promise<boolean> {
    const result = await db.delete(hauliers).where(eq(hauliers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Shipping Line methods
  async getAllShippingLines(): Promise<ShippingLine[]> {
    return await db.select().from(shippingLines);
  }

  async getShippingLine(id: string): Promise<ShippingLine | undefined> {
    const [shippingLine] = await db.select().from(shippingLines).where(eq(shippingLines.id, id));
    return shippingLine;
  }

  async createShippingLine(shippingLine: InsertShippingLine): Promise<ShippingLine> {
    const [created] = await db.insert(shippingLines).values(shippingLine).returning();
    return created;
  }

  async updateShippingLine(id: string, shippingLine: Partial<InsertShippingLine>): Promise<ShippingLine | undefined> {
    const [updated] = await db.update(shippingLines).set(shippingLine).where(eq(shippingLines.id, id)).returning();
    return updated;
  }

  async deleteShippingLine(id: string): Promise<boolean> {
    const result = await db.delete(shippingLines).where(eq(shippingLines.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Clearance Agent methods
  async getAllClearanceAgents(): Promise<ClearanceAgent[]> {
    return await db.select().from(clearanceAgents);
  }

  async getClearanceAgent(id: string): Promise<ClearanceAgent | undefined> {
    const [agent] = await db.select().from(clearanceAgents).where(eq(clearanceAgents.id, id));
    return agent;
  }

  async createClearanceAgent(agent: InsertClearanceAgent): Promise<ClearanceAgent> {
    const [created] = await db.insert(clearanceAgents).values(agent).returning();
    return created;
  }

  async updateClearanceAgent(id: string, agent: Partial<InsertClearanceAgent>): Promise<ClearanceAgent | undefined> {
    const [updated] = await db.update(clearanceAgents).set(agent).where(eq(clearanceAgents.id, id)).returning();
    return updated;
  }

  async deleteClearanceAgent(id: string): Promise<boolean> {
    const result = await db.delete(clearanceAgents).where(eq(clearanceAgents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Settings methods
  async getSettings(): Promise<Settings | undefined> {
    const [settingsRecord] = await db.select().from(settings).limit(1);
    return settingsRecord;
  }

  async updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<Settings | undefined> {
    const [updated] = await db.update(settings).set(settingsData).where(eq(settings.id, id)).returning();
    return updated;
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const [created] = await db.insert(settings).values(settingsData).returning();
    return created;
  }

  // Import Shipment methods
  async getAllImportShipments(): Promise<ImportShipment[]> {
    return await db.select().from(importShipments).orderBy(desc(importShipments.createdAt));
  }

  async getImportShipment(id: string): Promise<ImportShipment | undefined> {
    const [shipment] = await db.select().from(importShipments).where(eq(importShipments.id, id));
    return shipment;
  }

  async createImportShipment(insertShipment: InsertImportShipment): Promise<ImportShipment> {
    await this.initialize();
    const jobRef = this.getNextJobRef();
    
    const [shipment] = await db.insert(importShipments).values({
      ...insertShipment,
      jobRef: jobRef,
      createdAt: new Date().toISOString(),
    }).returning();

    // Auto-create Custom Clearance if rsToClear is true
    if (shipment.rsToClear) {
      const [clearance] = await db.insert(customClearances).values({
        jobRef: shipment.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
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
      }).returning();

      // Update shipment with linked clearance ID
      const [updated] = await db.update(importShipments)
        .set({ linkedClearanceId: clearance.id })
        .where(eq(importShipments.id, shipment.id))
        .returning();
      
      return updated;
    }

    return shipment;
  }

  async updateImportShipment(id: string, updates: Partial<InsertImportShipment>): Promise<ImportShipment | undefined> {
    const existing = await this.getImportShipment(id);
    if (!existing) return undefined;

    console.log('[DEBUG-STORAGE] Update import shipment:', id);
    console.log('[DEBUG-STORAGE] Existing rsToClear:', existing.rsToClear);
    console.log('[DEBUG-STORAGE] Update rsToClear:', updates.rsToClear);
    console.log('[DEBUG-STORAGE] Existing linkedClearanceId:', existing.linkedClearanceId);

    // If rsToClear is being changed from true to false, delete the linked clearance
    if (existing.rsToClear && updates.rsToClear === false && existing.linkedClearanceId) {
      console.log('[DEBUG-STORAGE] Deleting linked clearance');
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
      updates.linkedClearanceId = null;
    }

    // If rsToClear is true and there's no linked clearance, create one
    const finalRsToClear = updates.rsToClear !== undefined ? updates.rsToClear : existing.rsToClear;
    if (finalRsToClear === true && !existing.linkedClearanceId) {
      console.log('[DEBUG-STORAGE] Creating linked clearance for rsToClear=true');
      const updatedShipment = { ...existing, ...updates };
      
      const [clearance] = await db.insert(customClearances).values({
        jobRef: existing.jobRef,
        jobType: "import",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: updatedShipment.importCustomerId,
        exportCustomerId: null,
        receiverId: null,
        etaPort: updatedShipment.importDateEtaPort,
        portOfArrival: updatedShipment.portOfArrival,
        trailerOrContainerNumber: updatedShipment.trailerOrContainerNumber,
        departureFrom: updatedShipment.departureCountry,
        containerShipment: updatedShipment.containerShipment,
        vesselName: updatedShipment.vesselName,
        numberOfPieces: updatedShipment.numberOfPieces,
        packaging: updatedShipment.packaging,
        weight: updatedShipment.weight,
        cube: updatedShipment.cube,
        goodsDescription: updatedShipment.goodsDescription,
        invoiceValue: updatedShipment.invoiceValue,
        transportCosts: updatedShipment.freightCharge,
        clearanceCharge: updatedShipment.clearanceCharge,
        currency: updatedShipment.currency,
        additionalCommodityCodes: updatedShipment.additionalCommodityCodes,
        vatZeroRated: updatedShipment.vatZeroRated,
        clearanceType: updatedShipment.clearanceType,
        incoterms: null,
        customerReferenceNumber: updatedShipment.customerReferenceNumber,
        supplierName: updatedShipment.supplierName,
        attachments: null,
        createdFromType: "import",
        createdFromId: existing.id,
      }).returning();

      updates.linkedClearanceId = clearance.id;
    }

    const [updated] = await db.update(importShipments)
      .set(updates)
      .where(eq(importShipments.id, id))
      .returning();
    
    return updated;
  }

  async deleteImportShipment(id: string): Promise<boolean> {
    const existing = await this.getImportShipment(id);
    
    // If there's a linked clearance, delete it first
    if (existing?.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
    }
    
    const result = await db.delete(importShipments).where(eq(importShipments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Export Shipment methods
  async getAllExportShipments(): Promise<ExportShipment[]> {
    return await db.select().from(exportShipments).orderBy(desc(exportShipments.createdAt));
  }

  async getExportShipment(id: string): Promise<ExportShipment | undefined> {
    const [shipment] = await db.select().from(exportShipments).where(eq(exportShipments.id, id));
    return shipment;
  }

  async createExportShipment(insertShipment: InsertExportShipment): Promise<ExportShipment> {
    await this.initialize();
    const jobRef = this.getNextJobRef();
    
    const [shipment] = await db.insert(exportShipments).values({
      ...insertShipment,
      jobRef: jobRef,
      createdAt: new Date().toISOString(),
    }).returning();

    // Auto-create Custom Clearance if exportClearanceAgent is "R.S"
    if (shipment.exportClearanceAgent === "R.S") {
      const [clearance] = await db.insert(customClearances).values({
        jobRef: shipment.jobRef,
        jobType: "export",
        createdAt: new Date().toISOString(),
        status: "Awaiting Entry",
        importCustomerId: null,
        exportCustomerId: shipment.destinationCustomerId,
        receiverId: shipment.receiverId,
        etaPort: shipment.loadDate,
        portOfArrival: shipment.portOfArrival,
        trailerOrContainerNumber: shipment.trailerNo,
        departureFrom: shipment.departureFrom,
        containerShipment: shipment.containerShipment,
        vesselName: shipment.vesselName,
        numberOfPieces: shipment.numberOfPieces,
        packaging: shipment.packaging,
        weight: shipment.weight,
        cube: shipment.cube,
        goodsDescription: shipment.goodsDescription,
        invoiceValue: shipment.value,
        transportCosts: shipment.freightRateOut,
        clearanceCharge: shipment.clearanceCharge,
        currency: shipment.currency,
        additionalCommodityCodes: shipment.additionalCommodityCodes,
        vatZeroRated: false,
        clearanceType: null,
        incoterms: shipment.incoterms,
        customerReferenceNumber: shipment.customerReferenceNumber,
        supplierName: shipment.supplier,
        attachments: null,
        createdFromType: "export",
        createdFromId: shipment.id,
      }).returning();

      // Update shipment with linked clearance ID
      const [updated] = await db.update(exportShipments)
        .set({ linkedClearanceId: clearance.id })
        .where(eq(exportShipments.id, shipment.id))
        .returning();
      
      return updated;
    }

    return shipment;
  }

  async updateExportShipment(id: string, updates: Partial<InsertExportShipment>): Promise<ExportShipment | undefined> {
    const existing = await this.getExportShipment(id);
    if (!existing) return undefined;

    // If exportClearanceAgent is being changed from "R.S" to something else, delete the linked clearance
    if (existing.exportClearanceAgent === "R.S" && updates.exportClearanceAgent && updates.exportClearanceAgent !== "R.S" && existing.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
      updates.linkedClearanceId = null;
    }

    const [updated] = await db.update(exportShipments)
      .set(updates)
      .where(eq(exportShipments.id, id))
      .returning();
    
    return updated;
  }

  async deleteExportShipment(id: string): Promise<boolean> {
    const existing = await this.getExportShipment(id);
    
    // If there's a linked clearance, delete it first
    if (existing?.linkedClearanceId) {
      await db.delete(customClearances).where(eq(customClearances.id, existing.linkedClearanceId));
    }
    
    const result = await db.delete(exportShipments).where(eq(exportShipments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Custom Clearance methods
  async getAllCustomClearances(): Promise<CustomClearance[]> {
    return await db.select().from(customClearances).orderBy(desc(customClearances.createdAt));
  }

  async getCustomClearance(id: string): Promise<CustomClearance | undefined> {
    const [clearance] = await db.select().from(customClearances).where(eq(customClearances.id, id));
    return clearance;
  }

  async createCustomClearance(insertClearance: InsertCustomClearance): Promise<CustomClearance> {
    await this.initialize();
    const jobRef = this.getNextJobRef();
    
    const [clearance] = await db.insert(customClearances).values({
      ...insertClearance,
      jobRef: jobRef,
      createdAt: new Date().toISOString(),
    }).returning();

    return clearance;
  }

  async updateCustomClearance(id: string, updates: Partial<InsertCustomClearance>): Promise<CustomClearance | undefined> {
    const [updated] = await db.update(customClearances)
      .set(updates)
      .where(eq(customClearances.id, id))
      .returning();
    
    return updated;
  }

  async deleteCustomClearance(id: string): Promise<boolean> {
    const result = await db.delete(customClearances).where(eq(customClearances.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();