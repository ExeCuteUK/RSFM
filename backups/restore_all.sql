-- Contact Databases Restore Script
-- Generated: 2025-10-03T18:22:23.940Z
-- This script will restore all contact databases
-- WARNING: This will DELETE all existing data in these tables!

BEGIN;

-- Clear existing data
DELETE FROM clearance_agents;
DELETE FROM shipping_lines;
DELETE FROM hauliers;
DELETE FROM export_receivers;
DELETE FROM export_customers;
DELETE FROM import_customers;

-- Import backups (run each file in order)
\i import_customers_backup.sql
\i export_customers_backup.sql
\i export_receivers_backup.sql
\i hauliers_backup.sql
\i shipping_lines_backup.sql
\i clearance_agents_backup.sql

COMMIT;

-- Verify counts
SELECT 'import_customers' as table_name, COUNT(*) as record_count FROM import_customers
UNION ALL
SELECT 'export_customers', COUNT(*) FROM export_customers
UNION ALL
SELECT 'export_receivers', COUNT(*) FROM export_receivers
UNION ALL
SELECT 'hauliers', COUNT(*) FROM hauliers
UNION ALL
SELECT 'shipping_lines', COUNT(*) FROM shipping_lines
UNION ALL
SELECT 'clearance_agents', COUNT(*) FROM clearance_agents;
