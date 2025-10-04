import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertImportCustomerSchema,
  insertExportCustomerSchema,
  insertExportReceiverSchema,
  insertHaulierSchema,
  insertShippingLineSchema,
  insertClearanceAgentSchema,
  insertSettingsSchema,
  insertImportShipmentSchema,
  insertExportShipmentSchema,
  insertCustomClearanceSchema,
  insertUserSchema,
  updateUserSchema,
  type User
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import passport from "passport";
import { registerUser } from "./auth";
import bcrypt from "bcryptjs";

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as User).isAdmin) {
    return next();
  }
  res.status(403).json({ error: "Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== Auth Routes ==========
  
  // Check auth status - returns 200 with user:null when not authenticated to avoid redirect loops
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } else {
      res.json({ user: null });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  // Register (only if no users exist)
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Check if any users already exist
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        return res.status(403).json({ error: "Registration is closed. Please contact an administrator." });
      }

      const validatedData = insertUserSchema.parse(req.body);
      const user = await registerUser(storage, validatedData);
      
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res.status(500).json({ error: "Registration succeeded but login failed" });
        }
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(400).json({ error: "Registration failed" });
      }
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Check if registration is allowed (no users exist)
  app.get("/api/auth/registration-allowed", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ allowed: users.length === 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to check registration status" });
    }
  });

  // ========== User Management Routes (Admin only) ==========
  
  // Create new user (Admin only)
  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Failed to create user" });
      }
    }
  });
  
  // Get all users
  app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get single user
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const requestingUser = req.user as User;
      const requestedUserId = req.params.id;
      
      // Users can only view their own profile unless admin
      if (!requestingUser.isAdmin && requestingUser.id !== requestedUserId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const user = await storage.getUser(requestedUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update user
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const requestingUser = req.user as User;
      const targetUserId = req.params.id;
      
      // Users can only update their own profile unless admin
      if (!requestingUser.isAdmin && requestingUser.id !== targetUserId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = updateUserSchema.parse(req.body);
      
      // Non-admins cannot change admin status
      if (!requestingUser.isAdmin && validatedData.isAdmin !== undefined) {
        return res.status(403).json({ error: "Cannot modify admin status" });
      }
      
      const user = await storage.updateUser(targetUserId, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const requestingUser = req.user as User;
      const targetUserId = req.params.id;
      
      // Prevent self-deletion
      if (requestingUser.id === targetUserId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(targetUserId);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ========== Import Customers Routes ==========
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
      const validatedData = insertImportCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateImportCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Import customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid import customer data" });
      }
      res.status(500).json({ error: "Failed to update import customer" });
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
      const validatedData = insertExportCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateExportCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Export customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid export customer data" });
      }
      res.status(500).json({ error: "Failed to update export customer" });
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
      const validatedData = insertExportReceiverSchema.partial().parse(req.body);
      const receiver = await storage.updateExportReceiver(req.params.id, validatedData);
      if (!receiver) {
        return res.status(404).json({ error: "Export receiver not found" });
      }
      res.json(receiver);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid export receiver data" });
      }
      res.status(500).json({ error: "Failed to update export receiver" });
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

  // Get all contact emails for autocomplete
  app.get("/api/contacts/emails", async (_req, res) => {
    try {
      const importCustomers = await storage.getAllImportCustomers();
      const exportCustomers = await storage.getAllExportCustomers();
      
      console.log(`Found ${importCustomers.length} import customers, ${exportCustomers.length} export customers`);
      
      const emails: Array<{ email: string; name: string; type: string }> = [];
      
      // Collect import customer emails
      importCustomers.forEach(customer => {
        if (customer.email && Array.isArray(customer.email)) {
          customer.email.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Import Customer' });
            }
          });
        }
        if (customer.accountsEmail && Array.isArray(customer.accountsEmail)) {
          customer.accountsEmail.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Import Customer' });
            }
          });
        }
      });
      
      // Collect export customer emails
      exportCustomers.forEach(customer => {
        if (customer.email && Array.isArray(customer.email)) {
          customer.email.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Export Customer' });
            }
          });
        }
        if (customer.accountsEmail && Array.isArray(customer.accountsEmail)) {
          customer.accountsEmail.forEach(email => {
            if (email && email.trim()) {
              emails.push({ email: email.trim(), name: customer.companyName || '', type: 'Export Customer' });
            }
          });
        }
      });
      
      console.log(`Collected ${emails.length} total emails before deduplication`);
      
      // Remove duplicates and sort
      const uniqueEmails = Array.from(new Map(emails.map(item => [item.email, item])).values());
      uniqueEmails.sort((a, b) => a.email.localeCompare(b.email));
      
      console.log(`Returning ${uniqueEmails.length} unique emails`);
      
      res.json(uniqueEmails);
    } catch (error) {
      console.error("Error fetching contact emails:", error);
      res.status(500).json({ error: "Failed to fetch contact emails" });
    }
  });

  // ========== Hauliers Routes ==========
  
  // Get all hauliers
  app.get("/api/hauliers", async (_req, res) => {
    try {
      const hauliers = await storage.getAllHauliers();
      res.json(hauliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hauliers" });
    }
  });

  // Get single haulier
  app.get("/api/hauliers/:id", async (req, res) => {
    try {
      const haulier = await storage.getHaulier(req.params.id);
      if (!haulier) {
        return res.status(404).json({ error: "Haulier not found" });
      }
      res.json(haulier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch haulier" });
    }
  });

  // Create haulier
  app.post("/api/hauliers", async (req, res) => {
    try {
      const validatedData = insertHaulierSchema.parse(req.body);
      const haulier = await storage.createHaulier(validatedData);
      res.status(201).json(haulier);
    } catch (error) {
      res.status(400).json({ error: "Invalid haulier data" });
    }
  });

  // Update haulier
  app.patch("/api/hauliers/:id", async (req, res) => {
    try {
      const validatedData = insertHaulierSchema.partial().parse(req.body);
      const haulier = await storage.updateHaulier(req.params.id, validatedData);
      if (!haulier) {
        return res.status(404).json({ error: "Haulier not found" });
      }
      res.json(haulier);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid haulier data" });
      }
      res.status(500).json({ error: "Failed to update haulier" });
    }
  });

  // Delete haulier
  app.delete("/api/hauliers/:id", async (req, res) => {
    try {
      const success = await storage.deleteHaulier(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Haulier not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete haulier" });
    }
  });

  // ========== Shipping Lines Routes ==========
  
  // Get all shipping lines
  app.get("/api/shipping-lines", async (_req, res) => {
    try {
      const shippingLines = await storage.getAllShippingLines();
      res.json(shippingLines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping lines" });
    }
  });

  // Get single shipping line
  app.get("/api/shipping-lines/:id", async (req, res) => {
    try {
      const shippingLine = await storage.getShippingLine(req.params.id);
      if (!shippingLine) {
        return res.status(404).json({ error: "Shipping line not found" });
      }
      res.json(shippingLine);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping line" });
    }
  });

  // Create shipping line
  app.post("/api/shipping-lines", async (req, res) => {
    try {
      const validatedData = insertShippingLineSchema.parse(req.body);
      const shippingLine = await storage.createShippingLine(validatedData);
      res.status(201).json(shippingLine);
    } catch (error) {
      res.status(400).json({ error: "Invalid shipping line data" });
    }
  });

  // Update shipping line
  app.patch("/api/shipping-lines/:id", async (req, res) => {
    try {
      const validatedData = insertShippingLineSchema.partial().parse(req.body);
      const shippingLine = await storage.updateShippingLine(req.params.id, validatedData);
      if (!shippingLine) {
        return res.status(404).json({ error: "Shipping line not found" });
      }
      res.json(shippingLine);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid shipping line data" });
      }
      res.status(500).json({ error: "Failed to update shipping line" });
    }
  });

  // Delete shipping line
  app.delete("/api/shipping-lines/:id", async (req, res) => {
    try {
      const success = await storage.deleteShippingLine(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Shipping line not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shipping line" });
    }
  });

  // ========== Clearance Agents Routes ==========
  
  // Get all clearance agents
  app.get("/api/clearance-agents", async (_req, res) => {
    try {
      const agents = await storage.getAllClearanceAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clearance agents" });
    }
  });

  // Get single clearance agent
  app.get("/api/clearance-agents/:id", async (req, res) => {
    try {
      const agent = await storage.getClearanceAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Clearance agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clearance agent" });
    }
  });

  // Create clearance agent
  app.post("/api/clearance-agents", async (req, res) => {
    try {
      const validatedData = insertClearanceAgentSchema.parse(req.body);
      const agent = await storage.createClearanceAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ error: "Invalid clearance agent data" });
    }
  });

  // Update clearance agent
  app.patch("/api/clearance-agents/:id", async (req, res) => {
    try {
      const validatedData = insertClearanceAgentSchema.partial().parse(req.body);
      const agent = await storage.updateClearanceAgent(req.params.id, validatedData);
      if (!agent) {
        return res.status(404).json({ error: "Clearance agent not found" });
      }
      res.json(agent);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid clearance agent data" });
      }
      res.status(500).json({ error: "Failed to update clearance agent" });
    }
  });

  // Delete clearance agent
  app.delete("/api/clearance-agents/:id", async (req, res) => {
    try {
      const success = await storage.deleteClearanceAgent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Clearance agent not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete clearance agent" });
    }
  });

  // ========== Settings Routes ==========
  
  // Get settings (single record)
  app.get("/api/settings", async (_req, res) => {
    try {
      const settingsRecord = await storage.getSettings();
      if (!settingsRecord) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(settingsRecord);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Create settings
  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.parse(req.body);
      const settingsRecord = await storage.createSettings(validatedData);
      res.status(201).json(settingsRecord);
    } catch (error) {
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  // Update settings
  app.patch("/api/settings/:id", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.partial().parse(req.body);
      const settingsRecord = await storage.updateSettings(req.params.id, validatedData);
      if (!settingsRecord) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(settingsRecord);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ========== Import Shipments Routes ==========
  
  // Get all import shipments
  app.get("/api/import-shipments", async (_req, res) => {
    try {
      const shipments = await storage.getAllImportShipments();
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import shipments" });
    }
  });

  // Get single import shipment
  app.get("/api/import-shipments/:id", async (req, res) => {
    try {
      const shipment = await storage.getImportShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import shipment" });
    }
  });

  // Create import shipment
  app.post("/api/import-shipments", async (req, res) => {
    try {
      const validatedData = insertImportShipmentSchema.parse(req.body);
      const shipment = await storage.createImportShipment(validatedData);
      res.status(201).json(shipment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid import shipment data",
          details: error.errors 
        });
      }
      res.status(400).json({ error: "Invalid import shipment data" });
    }
  });

  // Update import shipment
  app.patch("/api/import-shipments/:id", async (req, res) => {
    try {
      // For updates, we make the validation less strict by not requiring all fields
      console.log('[DEBUG] Update import shipment:', req.params.id, 'rsToClear:', req.body.rsToClear);
      const shipment = await storage.updateImportShipment(req.params.id, req.body);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      console.log('[DEBUG] Updated shipment rsToClear:', shipment.rsToClear, 'linkedClearanceId:', shipment.linkedClearanceId);
      res.json(shipment);
    } catch (error: any) {
      console.error('[ERROR] Failed to update import shipment:', error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid import shipment data",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update import shipment" });
    }
  });

  // Update clearance status indicator
  app.patch("/api/import-shipments/:id/clearance-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        clearanceStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      
      // Sync to linked custom clearance if it exists
      if (shipment.linkedClearanceId) {
        await storage.updateCustomClearance(shipment.linkedClearanceId, {
          adviseAgentStatusIndicator: status
        });
      }
      
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update clearance status" });
    }
  });

  // Update delivery booked status indicator
  app.patch("/api/import-shipments/:id/delivery-booked-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        deliveryBookedStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update delivery booked status" });
    }
  });

  // Update haulier booking status indicator
  app.patch("/api/import-shipments/:id/haulier-booking-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        haulierBookingStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update haulier booking status" });
    }
  });

  // Update container release status indicator
  app.patch("/api/import-shipments/:id/container-release-status", async (req, res) => {
    try {
      const { status } = req.body;
      if (![1, 2, 3, 4].includes(status)) {
        return res.status(400).json({ error: "Status must be 1, 2, 3, or 4" });
      }
      const shipment = await storage.updateImportShipment(req.params.id, { 
        containerReleaseStatusIndicator: status 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update container release status" });
    }
  });

  // Update invoice customer status indicator
  app.patch("/api/import-shipments/:id/invoice-customer-status", async (req, res) => {
    try {
      const invoiceStatusSchema = z.object({
        status: z.union([z.literal(2), z.literal(3), z.null()]).optional()
      });
      const { status } = invoiceStatusSchema.parse(req.body);
      const shipment = await storage.updateImportShipment(req.params.id, { 
        invoiceCustomerStatusIndicator: status ?? null 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid status value. Must be 2 (yellow), 3 (green), or null", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update invoice customer status" });
    }
  });

  // Update send POD to customer status indicator
  app.patch("/api/import-shipments/:id/send-pod-to-customer-status", async (req, res) => {
    try {
      const sendPodStatusSchema = z.object({
        status: z.union([z.literal(2), z.literal(3), z.null()]).optional()
      });
      const { status } = sendPodStatusSchema.parse(req.body);
      const shipment = await storage.updateImportShipment(req.params.id, { 
        sendPodToCustomerStatusIndicator: status ?? null 
      });
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid status value. Must be 2 (yellow), 3 (green), or null", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update send POD to customer status" });
    }
  });

  // Delete file from attachments or proofOfDelivery
  app.delete("/api/import-shipments/:id/files", async (req, res) => {
    try {
      const deleteFileSchema = z.object({
        filePath: z.string(),
        fileType: z.enum(["attachment", "pod"])
      });
      const { filePath, fileType } = deleteFileSchema.parse(req.body);
      
      const shipment = await storage.getImportShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Import shipment not found" });
      }

      let updatedFiles;
      if (fileType === "attachment") {
        updatedFiles = (shipment.attachments || []).filter(f => f !== filePath);
        await storage.updateImportShipment(req.params.id, { attachments: updatedFiles });
      } else {
        updatedFiles = (shipment.proofOfDelivery || []).filter(f => f !== filePath);
        await storage.updateImportShipment(req.params.id, { proofOfDelivery: updatedFiles });
      }

      const updated = await storage.getImportShipment(req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid file deletion request", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Delete import shipment
  app.delete("/api/import-shipments/:id", async (req, res) => {
    try {
      const success = await storage.deleteImportShipment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Import shipment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete import shipment" });
    }
  });

  // ========== Export Shipments Routes ==========
  
  // Get all export shipments
  app.get("/api/export-shipments", async (_req, res) => {
    try {
      const shipments = await storage.getAllExportShipments();
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export shipments" });
    }
  });

  // Get single export shipment
  app.get("/api/export-shipments/:id", async (req, res) => {
    try {
      const shipment = await storage.getExportShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ error: "Export shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch export shipment" });
    }
  });

  // Create export shipment
  app.post("/api/export-shipments", async (req, res) => {
    try {
      const validatedData = insertExportShipmentSchema.parse(req.body);
      const shipment = await storage.createExportShipment(validatedData);
      res.status(201).json(shipment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid export shipment data",
          details: error.errors 
        });
      }
      res.status(400).json({ error: "Invalid export shipment data" });
    }
  });

  // Update export shipment
  app.patch("/api/export-shipments/:id", async (req, res) => {
    try {
      // For updates, we make the validation less strict by not requiring all fields
      const shipment = await storage.updateExportShipment(req.params.id, req.body);
      if (!shipment) {
        return res.status(404).json({ error: "Export shipment not found" });
      }
      res.json(shipment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid export shipment data",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update export shipment" });
    }
  });

  // Delete export shipment
  app.delete("/api/export-shipments/:id", async (req, res) => {
    try {
      const success = await storage.deleteExportShipment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Export shipment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete export shipment" });
    }
  });

  // ========== Custom Clearances Routes ==========
  
  // Get all custom clearances
  app.get("/api/custom-clearances", async (_req, res) => {
    try {
      const clearances = await storage.getAllCustomClearances();
      res.json(clearances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom clearances" });
    }
  });

  // Get single custom clearance
  app.get("/api/custom-clearances/:id", async (req, res) => {
    try {
      const clearance = await storage.getCustomClearance(req.params.id);
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom clearance" });
    }
  });

  // Create custom clearance
  app.post("/api/custom-clearances", async (req, res) => {
    try {
      const validatedData = insertCustomClearanceSchema.parse(req.body);
      const clearance = await storage.createCustomClearance(validatedData);
      res.status(201).json(clearance);
    } catch (error) {
      res.status(400).json({ error: "Invalid custom clearance data" });
    }
  });

  // Update custom clearance
  app.patch("/api/custom-clearances/:id", async (req, res) => {
    try {
      const validatedData = insertCustomClearanceSchema.partial().parse(req.body);
      const clearance = await storage.updateCustomClearance(req.params.id, validatedData);
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid custom clearance data" });
      }
      res.status(500).json({ error: "Failed to update custom clearance" });
    }
  });

  // Delete custom clearance
  app.delete("/api/custom-clearances/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomClearance(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom clearance" });
    }
  });

  // Update advise agent status indicator
  app.patch("/api/custom-clearances/:id/advise-agent-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.updateCustomClearance(req.params.id, { 
        adviseAgentStatusIndicator: status 
      });
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      
      // Sync to linked import shipment if it was created from import
      if (clearance.createdFromType === "import" && clearance.createdFromId) {
        await storage.updateImportShipment(clearance.createdFromId, {
          clearanceStatusIndicator: status
        });
      }
      
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Update send entry to customer status indicator
  app.patch("/api/custom-clearances/:id/send-entry-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.updateCustomClearance(req.params.id, { 
        sendEntryToCustomerStatusIndicator: status 
      });
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Update invoice customer status indicator
  app.patch("/api/custom-clearances/:id/invoice-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.updateCustomClearance(req.params.id, { 
        invoiceCustomerStatusIndicator: status 
      });
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      res.json(clearance);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Update send cleared entry status indicator
  app.patch("/api/custom-clearances/:id/send-cleared-entry-status", async (req, res) => {
    try {
      const { status } = req.body;
      const clearance = await storage.getCustomClearance(req.params.id);
      if (!clearance) {
        return res.status(404).json({ error: "Custom clearance not found" });
      }
      if (clearance.jobType !== "import") {
        return res.status(400).json({ error: "This status is only for import clearances" });
      }
      const updated = await storage.updateCustomClearance(req.params.id, { 
        sendClearedEntryStatusIndicator: status 
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // ========== Object Storage Routes ==========

  // Get presigned upload URL for file uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const filename = req.body?.filename;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(filename);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Download/serve uploaded files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const decodedPath = decodeURIComponent(req.path);
      const objectFile = await objectStorageService.getObjectEntityFile(decodedPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Normalize and set ACL policy for uploaded files
  app.post("/api/objects/normalize", async (req, res) => {
    try {
      const urls = req.body.urls;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "urls array is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const paths: string[] = [];

      for (const url of urls) {
        const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          url,
          {
            owner: "system",
            visibility: "public",
          }
        );
        paths.push(objectPath);
      }

      res.json({ paths });
    } catch (error) {
      console.error("Error normalizing object paths:", error);
      res.status(500).json({ error: "Failed to normalize object paths" });
    }
  });

  // ========== Backup Routes (Admin only) ==========

  // List all backups
  app.get("/api/backups", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { readdirSync, readFileSync, statSync } = await import("fs");
      const { join } = await import("path");
      
      const backupsDir = "backups";
      const entries = readdirSync(backupsDir, { withFileTypes: true });
      const backups = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("backup_")) {
          const metadataPath = join(backupsDir, entry.name, "metadata.json");
          try {
            const metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
            const stats = statSync(join(backupsDir, entry.name));
            backups.push({
              ...metadata,
              createdAt: stats.birthtime.toISOString(),
            });
          } catch (error) {
            // Skip backups without metadata
            console.warn(`Skipping backup ${entry.name}: no metadata found`);
          }
        }
      }
      
      // Sort by timestamp, newest first
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(backups);
    } catch (error) {
      console.error("List backups error:", error);
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  // Create backup of all contact databases
  app.post("/api/backups/create", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { execSync } = await import("child_process");
      const result = execSync("tsx scripts/backup-contact-databases.ts", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      // Parse the output to get backup name
      const backupNameMatch = result.match(/Backup name: (backup_[^\n]+)/);
      const backupName = backupNameMatch ? backupNameMatch[1] : null;
      
      if (!backupName) {
        throw new Error("Failed to extract backup name");
      }
      
      // Read metadata file
      const { readFileSync } = await import("fs");
      const metadata = JSON.parse(readFileSync(`backups/${backupName}/metadata.json`, "utf-8"));
      
      res.json({
        success: true,
        ...metadata,
      });
    } catch (error) {
      console.error("Backup error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Restore from specific backup
  app.post("/api/backups/restore/:backupName", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { backupName } = req.params;
      const { tables } = req.body;
      const { execSync } = await import("child_process");
      
      // Validate tables array
      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ error: "tables array is required and must not be empty" });
      }
      
      // Pass tables as JSON string argument
      const tablesJson = JSON.stringify(tables);
      const result = execSync(`tsx scripts/restore-contact-databases.ts ${backupName} '${tablesJson}'`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      // Parse the output to get restore statistics
      const lines = result.split("\n");
      const restoredTables = [];
      let totalRecords = 0;
      
      for (const line of lines) {
        const match = line.match(/✓ (.+) restored: (\d+) records/);
        if (match) {
          const count = parseInt(match[2]);
          restoredTables.push({
            name: match[1],
            count: count,
          });
          totalRecords += count;
        }
      }
      
      res.json({
        success: true,
        backupName,
        timestamp: new Date().toISOString(),
        tables: restoredTables,
        totalRecords,
      });
    } catch (error) {
      console.error("Restore error:", error);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  // Delete specific backup
  app.delete("/api/backups/:backupName", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { backupName } = req.params;
      const { rmSync } = await import("fs");
      const { join } = await import("path");
      
      // Validate backup name to prevent directory traversal
      if (!backupName.startsWith("backup_") || backupName.includes("..")) {
        return res.status(400).json({ error: "Invalid backup name" });
      }
      
      const backupPath = join("backups", backupName);
      rmSync(backupPath, { recursive: true, force: true });
      
      res.json({
        success: true,
        message: `Backup ${backupName} deleted successfully`,
      });
    } catch (error) {
      console.error("Delete backup error:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // ========== Terminal49 Container Tracking Routes ==========
  
  const TERMINAL49_API_KEY = process.env.TERMINAL49_API_KEY;
  const TERMINAL49_BASE_URL = "https://api.terminal49.com/v2";

  // Mapping of shipping line names to SCAC codes
  const SHIPPING_LINE_SCAC_MAP: Record<string, string> = {
    // Cosco
    "cosco": "COSU",
    "cosco shipping lines": "COSU",
    "cosco shipping": "COSU",
    
    // Maersk
    "maersk": "MAEU",
    "maersk line": "MAEU",
    
    // MSC
    "msc": "MSCU",
    "mediterranean shipping company": "MSCU",
    
    // CMA CGM
    "cma cgm": "CMDU",
    "cma-cgm": "CMDU",
    
    // Hapag-Lloyd
    "hapag lloyd": "HLCU",
    "hapag-lloyd": "HLCU",
    
    // ONE (Ocean Network Express)
    "one": "ONEY",
    "ocean network express": "ONEY",
    
    // Evergreen
    "evergreen": "EGLV",
    "evergreen line": "EGLV",
    
    // Yang Ming
    "yang ming": "YMLU",
    
    // ZIM
    "zim": "ZIMU",
    
    // PIL (Pacific International Lines)
    "pil": "PCIU",
    "pacific international lines": "PCIU",
    
    // HMM (Hyundai Merchant Marine)
    "hmm": "HDMU",
    "hyundai": "HDMU",
    
    // OOCL (Orient Overseas Container Line)
    "oocl": "OOLU",
    
    // K Line
    "k line": "KKLU",
    "kawasaki kisen": "KKLU",
  };

  // Helper function to get SCAC code from shipping line name
  function getSCACFromShippingLine(shippingLineName: string | null | undefined): string | null {
    if (!shippingLineName) return null;
    
    const normalizedName = shippingLineName.toLowerCase().trim();
    return SHIPPING_LINE_SCAC_MAP[normalizedName] || null;
  }

  // Create tracking request for a container
  app.post("/api/terminal49/track", async (req, res) => {
    try {
      const { containerNumber, shippingLine, billOfLading } = req.body;
      
      if (!TERMINAL49_API_KEY) {
        return res.status(500).json({ error: "Terminal49 API key not configured" });
      }

      // Determine request type and number
      let requestType = "container";
      let requestNumber = containerNumber;
      
      if (billOfLading) {
        requestType = "bill_of_lading";
        requestNumber = billOfLading;
      }

      // Try to get SCAC code from shipping line name lookup, fallback to container number first 4 chars
      let scacCode = getSCACFromShippingLine(shippingLine);
      
      if (!scacCode && containerNumber) {
        // Fallback: Extract from first 4 characters of container number
        scacCode = containerNumber.substring(0, 4).toUpperCase();
      }

      const response = await fetch(`${TERMINAL49_BASE_URL}/tracking_requests`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${TERMINAL49_API_KEY}`,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "tracking_request",
            attributes: {
              request_type: requestType,
              request_number: requestNumber,
              scac: scacCode,
            },
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Terminal49 API error:", response.status, JSON.stringify(data, null, 2));
        
        // Handle duplicate tracking request - container already being tracked
        const duplicateError = data.errors?.find((e: any) => e.code === 'duplicate');
        if (duplicateError) {
          try {
            // Fetch all shipments and find the matching one
            const shipmentsResponse = await fetch(
              `${TERMINAL49_BASE_URL}/shipments?include=containers`,
              {
                headers: {
                  "Authorization": `Token ${TERMINAL49_API_KEY}`,
                  "Content-Type": "application/vnd.api+json",
                },
              }
            );
            
            if (shipmentsResponse.ok) {
              const shipmentsData = await shipmentsResponse.json();
              
              // Find the shipment that matches our container
              // Check both bill_of_lading_number and containers array
              const shipment = shipmentsData.data?.find((s: any) => {
                // Check bill of lading number
                if (s.attributes?.bill_of_lading_number === requestNumber) {
                  return true;
                }
                // Check containers array
                if (s.attributes?.containers?.some((c: any) => c.number === requestNumber)) {
                  return true;
                }
                return false;
              });
              
              if (shipment) {
                // Return a response with the shipment ID
                return res.json({
                  data: {
                    id: duplicateError.meta?.tracking_request_id,
                    type: "tracking_request",
                    attributes: {
                      status: "created",
                    },
                    relationships: {
                      tracked_object: {
                        data: {
                          id: shipment.id,
                          type: "shipment"
                        }
                      }
                    }
                  }
                });
              }
            }
          } catch (e) {
            console.error("Error fetching shipments:", e);
          }
          
          // Fallback: Direct to Terminal49 website
          return res.json({
            data: {
              id: duplicateError.meta?.tracking_request_id,
              type: "tracking_request",
              attributes: {
                status: "view_on_terminal49",
                request_number: requestNumber,
              },
              meta: {
                terminal49_url: `https://app.terminal49.com/shipments`
              }
            }
          });
        }
        
        // Add helpful message for SCAC not recognized
        const scacError = data.errors?.find((e: any) => e.code === 'not_recognized' && e.source?.pointer?.includes('scac'));
        if (scacError) {
          const source = getSCACFromShippingLine(shippingLine) ? `shipping line "${shippingLine}"` : "container number";
          return res.status(response.status).json({ 
            error: "Shipping line SCAC code not recognized", 
            message: `The shipping line code '${scacCode}' (from ${source}) is not recognized by Terminal49. Please check the shipping line name or contact support.`,
            details: data 
          });
        }
        
        return res.status(response.status).json({ 
          error: "Terminal49 API error", 
          details: data 
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Terminal49 track error:", error);
      res.status(500).json({ error: "Failed to create tracking request" });
    }
  });

  // Get shipment details by ID
  app.get("/api/terminal49/shipments/:id", async (req, res) => {
    try {
      if (!TERMINAL49_API_KEY) {
        return res.status(500).json({ error: "Terminal49 API key not configured" });
      }

      // Workaround: API key can't fetch individual shipments, so fetch all and filter
      const response = await fetch(
        `${TERMINAL49_BASE_URL}/shipments`,
        {
          headers: {
            "Authorization": `Token ${TERMINAL49_API_KEY}`,
            "Content-Type": "application/vnd.api+json",
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Terminal49 API error:", response.status, JSON.stringify(data, null, 2));
        return res.status(response.status).json({ 
          error: "Terminal49 API error", 
          details: data 
        });
      }

      // Find the requested shipment
      const shipment = data.data?.find((s: any) => s.id === req.params.id);
      
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      // Return in the same format as the individual endpoint would
      res.json({
        data: shipment,
        included: data.included?.filter((inc: any) => {
          // Filter included records related to this shipment
          return inc.relationships?.shipment?.data?.id === req.params.id;
        })
      });
    } catch (error) {
      console.error("Terminal49 shipment error:", error);
      res.status(500).json({ error: "Failed to get shipment details" });
    }
  });

  // List all tracked shipments
  app.get("/api/terminal49/shipments", async (req, res) => {
    try {
      if (!TERMINAL49_API_KEY) {
        return res.status(500).json({ error: "Terminal49 API key not configured" });
      }

      const response = await fetch(
        `${TERMINAL49_BASE_URL}/shipments?include=containers`,
        {
          headers: {
            "Authorization": `Token ${TERMINAL49_API_KEY}`,
            "Content-Type": "application/vnd.api+json",
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Terminal49 API error:", response.status, JSON.stringify(data, null, 2));
        return res.status(response.status).json({ 
          error: "Terminal49 API error", 
          details: data 
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Terminal49 list shipments error:", error);
      res.status(500).json({ error: "Failed to list shipments" });
    }
  });

  // ========== Gmail Routes (Per-User OAuth) ==========
  
  // Get OAuth URL for Gmail connection
  app.get("/api/gmail/auth-url", requireAuth, async (req, res) => {
    try {
      const { google } = await import("googleapis");
      // Use REPLIT_DEV_DOMAIN for dev, or construct production URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'http://localhost:5000';
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        `${baseUrl}/api/gmail/callback`
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.compose',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        state: (req.user as User).id, // Pass user ID as state
        prompt: 'consent', // Force consent to get refresh token
      });

      res.json({ authUrl });
    } catch (error) {
      console.error("Gmail auth URL error:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  // Handle OAuth callback
  app.get("/api/gmail/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const userId = state as string;

      if (!code || !userId) {
        return res.status(400).send("Missing authorization code or user ID");
      }

      const { google } = await import("googleapis");
      // Use REPLIT_DEV_DOMAIN for dev, or construct production URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'http://localhost:5000';
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        `${baseUrl}/api/gmail/callback`
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // Get user's email address
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();

      // Store tokens in user record
      await storage.updateUser(userId, {
        gmailAccessToken: tokens.access_token || null,
        gmailRefreshToken: tokens.refresh_token || null,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        gmailEmail: data.email || null,
      });

      // Redirect to settings page
      res.send(`
        <html>
          <body>
            <h1>Gmail Connected Successfully!</h1>
            <p>Your Gmail account has been connected. You can close this window and return to the application.</p>
            <script>
              setTimeout(() => {
                window.location.href = '/settings?tab=email';
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Gmail callback error:", error);
      res.status(500).send("Failed to connect Gmail account");
    }
  });

  // Disconnect Gmail
  app.post("/api/gmail/disconnect", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.updateUser(user.id, {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailEmail: null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Gmail disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Gmail" });
    }
  });
  
  // Get Gmail connection status (per-user)
  app.get("/api/gmail/status", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json({ 
        connected: !!user.gmailEmail, 
        email: user.gmailEmail 
      });
    } catch (error) {
      res.json({ connected: false, email: null });
    }
  });

  // Send email with attachment (per-user Gmail OAuth)
  app.post("/api/gmail/send", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { to, subject, body, attachmentUrl, attachmentFilename } = req.body;
      
      if (!to || !subject || !attachmentUrl || !attachmentFilename) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user has Gmail connected
      if (!user.gmailAccessToken || !user.gmailRefreshToken) {
        return res.status(401).json({ error: "Gmail not connected. Please connect your Gmail account in Settings." });
      }

      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );

      // Set credentials with refresh token support
      oauth2Client.setCredentials({
        access_token: user.gmailAccessToken,
        refresh_token: user.gmailRefreshToken,
        expiry_date: user.gmailTokenExpiry ? new Date(user.gmailTokenExpiry).getTime() : undefined,
      });

      // Auto-refresh access token if expired
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          await storage.updateUser(user.id, {
            gmailAccessToken: tokens.access_token,
            gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          });
        }
      });

      // Convert relative URL to absolute if needed
      let fullAttachmentUrl = attachmentUrl;
      if (attachmentUrl.startsWith('/')) {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : process.env.REPL_SLUG 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
            : 'http://localhost:5000';
        fullAttachmentUrl = `${baseUrl}${attachmentUrl}`;
      }

      // Fetch the PDF file
      const pdfResponse = await fetch(fullAttachmentUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
      }
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      const pdfBase64 = pdfBuffer.toString('base64');

      // Create email with attachment
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Build email body with signature
      let messageText = body ? body.replace(/\n/g, '<br>') : '';
      
      // Add default company signature with user's name
      const signatureTemplate = `<br>
<div class="moz-signature">-- <br>
  <div class="moz-signature">
    <div class="moz-signature"><br>
      <div class="moz-signature">Kind Regards,<br>
        ${user.fullName}
        <div class="moz-signature">
          <div class="moz-signature">
            <div class="moz-signature">
              <div class="moz-signature">
                <div class="moz-signature">
                  <div class="moz-signature">
                    <div class="moz-signature">
                      <div class="moz-signature">
                        <div class="moz-signature">
                          <div class="moz-signature">
                            <div class="moz-signature">
                              <div class="moz-signature"><br>
                                <table style="width: 100%; border-collapse: collapse;" cellpadding="5" border="0">
                                  <tbody>
                                    <tr>
                                      <td style="width: 3.97728%;"><img src="data:image/jpeg;filename=emailsig.jpg;base64,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IyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyMS4xIChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjEtMTAtMDFUMTQ6MTQ6MDgrMDE6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjEtMTAtMDFUMTQ6MTQ6MDgrMDE6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIxLTEwLTAxVDE0OjE0OjA4KzAxOjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjI1OTkwZTczLTU1ZTYtZWM0Mi1hNGIwLWNiMjkyOTI3N2JkNSIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjFmZmNiMDYwLWUzODEtYTE0ZC1hYjk1LTgxMGQwNzM5NTJlMCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmI1ZDgxYTRlLTA3MTAtNGE0YS1iN2VlLThlOGQ3ODQ4NTdkZSIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgZGM6Zm9ybWF0PSJpbWFnZS9qcGVnIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpiNWQ4MWE0ZS0wNzEwLTRhNGEtYjdlZS04ZThkNzg0ODU3ZGUiIHN0RXZ0OndoZW49IjIwMjEtMTAtMDFUMTQ6MTQ6MDgrMDE6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMS4xIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MjU5OTBlNzMtNTVlNi1lYzQyLWE0YjAtY2IyOTI5Mjc3YmQ1IiBzdEV2dDp3aGVuPSIyMDIxLTEwLTAxVDE0OjE0OjA4KzAxOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjEuMSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDxwaG90b3Nob3A6VGV4dExheWVycz4gPHJkZjpCYWc+IDxyZGY6bGkgcGhvdG9zaG9wOkxheWVyTmFtZT0iRiBSIEUgSSBHIEggVCAgIEwgVCBEIiBwaG90b3Nob3A6TGF5ZXJUZXh0PSJGIFIgRSBJIEcgSCBUICAgTCBUIEQiLz4gPHJkZjpsaSBwaG90b3Nob3A6TGF5ZXJOYW1lPSJGIFIgRSBJIEcgSCBUICBMIFQgRCIgcGhvdG9zaG9wOkxheWVyVGV4dD0iRiBSIEUgSSBHIEggVCAgTCBUIEQiLz4gPHJkZjpsaSBwaG90b3Nob3A6TGF5ZXJOYW1lPSJJIE4gVCBFIFIgTiBBIFQgSSBPIE4gQSBMIiBwaG90b3Nob3A6TGF5ZXJUZXh0PSJJIE4gVCBFIFIgTiBBIFQgSSBPIE4gQSBMIi8+IDwvcmRmOkJhZz4gPC9waG90b3Nob3A6VGV4dExheWVycz4gPHBob3Rvc2hvcDpEb2N1bWVudEFuY2VzdG9ycz4gPHJkZjpCYWc+IDxyZGY6bGk+eG1wLmRpZDo0OTgxNzc5Ni01NjYxLTRhNDQtODY4Yy1hODExNTI5MjBjN2Y8L3JkZjpsaT4gPC9yZGY6QmFnPiA8L3Bob3Rvc2hvcDpEb2N1bWVudEFuY2VzdG9ycz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg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V+I2/tzA0+T3pNHtqGmhyFR5Go6SorIqZYUraoTe690KPv3Xuv/Q3+Pfuvde9+691737r3Xvfuvde9+690S/tPC793N8mdrbd2vlOxcRtqv6dq5t3VUFR3dhevBBTdpbNjnGF3XtLLYnrnBdsLtaqyjUSzNLkqmAfuRmmjDJ7r3QD98nuqT5an+5NV8gMf1di858DspvnK7Opu8Z8Rj4D2x8hE37B11h1xOd6d31id1RwbGwHZ2PhpS+F2PmKzPPPR5LG0dTH7r3Qo53IbtX5m79o2Hd8nW1F138VMjJS4/B/JEbGq971e+fkfTZGLr7ceCeDp6aqNRSbKTetEGaigwciz5poICzv7r3Qj4Nt5L3j8q222nYUmRXrvqhtiR75btJOnpN3DB9gmRNkvuEHrlC9f8Aw4Z47b/fB8X3v7nj9+690zfHabds0XSkm6MR37Luh+gq09p53snMbhx2DpezDX9e/wB5sburZ2XKbbn35W7hTIS4ar2ukmAp8ZDk44JIqKTFLU+690XPYsXZAyXxzlyNf8mGw5/mKfLwboocviflemSTrvx/MQdWt2BlcvmnpZfj6ZhsptvrlqJNlaTjVpDcKze690ZjsradRU979a7fiy/fMeA7H293XUbuyW0tz900+0MHkocF15jNrrUZzalWmxutqilo6OobDxSyY81Nb9zURLPVzVUsvuvdKH5JVVdR5D48VNIvbL0kfyE2t/HV6rpO2q5DhH2nveN/9INL1RDUGXr4ZdqP7z+OocEs3hNRYhCPde6ZvkvV1ua6G3n2HtRO8aDceF2tunF7XwewaLt7Fbxra7IbgxGPXJJ15sOCPeGYyKtgRJjpZKGSaloaqaVVjSeU+/de6596Yqo2ttLq6m23V9318NV8iOuK+s/ulk+6d17gpcBuPeBqt3Uu5qzacuU3RF11TY7IVRnhzEjYbFU/jiH28NPSxw+691P+MFT2dMe/afe0O6l69x3f+covjpV7/i3HFv7IdOnrnrGszE+6V3hT0+6nho++qze9HgpK/XNPtalxciu8Txsfde6NH7917r3v3Xuve/de697917r3v3Xuve/de6//0d/j37r3Xvfuvde9+691737r3Xvfuvde9+691737r3Xvfuvde9+691737r3Xvfuvde9+691737r3Xvfuvde9+691737r3Xvfuvde9+691737r3Xvfuvde9+691737r3X/9k=" alt="" width="171" height="150"><br>
                                      </td>
                                      <td style="width: 96.0227%;"><span style="color: #993366;"><em><strong>R.S. International Freight Ltd</strong></em></span><br>
                                        10b Hornsby Square, Southfields Business Park, Laindon, Essex, SS15 6SD<br>
                                        Telephone: +44 (0)1708 865000<br>
                                        Fax: +44 (0)1708 865010<br>
                                        <a href="http://www.rs-international.com">http://www.rs-international.com</a></td>
                                    </tr>
                                  </tbody>
                                </table>
                                <b><em><span style="color:red;"><br></span></em><span style="color:red;"><a href="http://rs-international.com/rs_terms_v4.pdf"><u>Please click here for our Tariff guide, authorisation forms, terms &amp; CDS Switchover information</u></a></span></b><b><em><span style="color:red;"><br></span></em></b></div>
                              <div class="moz-signature"><em><br></em></div>
                              <div class="moz-signature"><em>This email and the information it contains may be privileged and/or confidential. It is for the intended addressee(s) only. The unauthorised use, disclosure or copying of this email, or any information it contains is prohibited and could in certain circumstances be a criminal offence. If you are not the intended recipient, please notify the sender and delete the message from your system. RS International Freight Limited monitors emails to ensure its systems operate effectively and to minimise the risk of viruses. Whilst it has taken reasonable steps to scan this email, it does not accept liability for any virus that it may contain. All Business transacted subject the BIFA standard trading conditions 2017 edition.</em></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
      
      messageText += signatureTemplate;
      
      // Wrap in proper HTML structure with email-friendly styles
      const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
${messageText}
</body>
</html>`;
      
      // Base64 encode the HTML body
      const htmlBodyBase64 = Buffer.from(htmlBody).toString('base64');
      
      const boundary = '----=_Part_' + Date.now();
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        htmlBodyBase64,
        '',
        `--${boundary}`,
        'Content-Type: application/pdf',
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachmentFilename}"`,
        '',
        pdfBase64,
        '',
        `--${boundary}--`
      ].join('\r\n');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true, messageId: result.data.id });
    } catch (error) {
      console.error("Gmail send error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}