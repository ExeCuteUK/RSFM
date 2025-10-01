import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertImportCustomerSchema,
  insertExportCustomerSchema,
  insertExportReceiverSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== Import Customers Routes ==========
  
  // Get all import customers
  app.get("/api/import-customers", async (_req, res) => {
    try {
      const customers = await storage.getAllImportCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import customers" });
    }
  });

  // Get single import customer
  app.get("/api/import-customers/:id", async (req, res) => {
    try {
      const customer = await storage.getImportCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import customer" });
    }
  });

  // Create import customer
  app.post("/api/import-customers", async (req, res) => {
    try {
      const validatedData = insertImportCustomerSchema.parse(req.body);
      const customer = await storage.createImportCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid import customer data" });
    }
  });

  // Update import customer
  app.patch("/api/import-customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateImportCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Failed to update import customer" });
    }
  });

  // Delete import customer
  app.delete("/api/import-customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteImportCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete import customer" });
    }
  });

  // ========== Export Customers Routes ==========
  
  // Get all export customers
  app.get("/api/export-customers", async (_req, res) => {
    try {
      const customers = await storage.getAllExportCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export customers" });
    }
  });

  // Get single export customer
  app.get("/api/export-customers/:id", async (req, res) => {
    try {
      const customer = await storage.getExportCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export customer" });
    }
  });

  // Create export customer
  app.post("/api/export-customers", async (req, res) => {
    try {
      const validatedData = insertExportCustomerSchema.parse(req.body);
      const customer = await storage.createExportCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid export customer data" });
    }
  });

  // Update export customer
  app.patch("/api/export-customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateExportCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Failed to update export customer" });
    }
  });

  // Delete export customer
  app.delete("/api/export-customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteExportCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete export customer" });
    }
  });

  // ========== Export Receivers Routes ==========
  
  // Get all export receivers
  app.get("/api/export-receivers", async (_req, res) => {
    try {
      const receivers = await storage.getAllExportReceivers();
      res.json(receivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export receivers" });
    }
  });

  // Get single export receiver
  app.get("/api/export-receivers/:id", async (req, res) => {
    try {
      const receiver = await storage.getExportReceiver(req.params.id);
      if (!receiver) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.json(receiver);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export receiver" });
    }
  });

  // Create export receiver
  app.post("/api/export-receivers", async (req, res) => {
    try {
      const validatedData = insertExportReceiverSchema.parse(req.body);
      const receiver = await storage.createExportReceiver(validatedData);
      res.status(201).json(receiver);
    } catch (error) {
      res.status(400).json({ error: "Invalid export receiver data" });
    }
  });

  // Update export receiver
  app.patch("/api/export-receivers/:id", async (req, res) => {
    try {
      const receiver = await storage.updateExportReceiver(req.params.id, req.body);
      if (!receiver) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.json(receiver);
    } catch (error) {
      res.status(400).json({ error: "Failed to update export receiver" });
    }
  });

  // Delete export receiver
  app.delete("/api/export-receivers/:id", async (req, res) => {
    try {
      const success = await storage.deleteExportReceiver(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete export receiver" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}