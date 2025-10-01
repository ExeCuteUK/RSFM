import { 
  type User, 
  type InsertUser,
  type ImportCustomer,
  type InsertImportCustomer,
  type ExportCustomer,
  type InsertExportCustomer,
  type ExportReceiver,
  type InsertExportReceiver
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private importCustomers: Map<string, ImportCustomer>;
  private exportCustomers: Map<string, ExportCustomer>;
  private exportReceivers: Map<string, ExportReceiver>;

  constructor() {
    this.users = new Map();
    this.importCustomers = new Map();
    this.exportCustomers = new Map();
    this.exportReceivers = new Map();
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
}

export const storage = new MemStorage();