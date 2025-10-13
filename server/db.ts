import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using Neon serverless (Replit) or standard PostgreSQL (Ubuntu)
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                       process.env.DATABASE_URL.includes('@ep-') ||
                       process.env.REPL_ID !== undefined;

let pool: NeonPool | PgPool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzleNode>;

if (isNeonDatabase) {
  // Replit/Neon serverless configuration
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
} else {
  // Standard PostgreSQL configuration (Ubuntu)
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNode({ client: pool, schema });
}

export { pool, db };
