-- Backup for shipping_lines
-- 2 records
-- Generated: 2025-10-10T09:36:55.897Z

INSERT INTO shipping_lines ("id", "created_by", "shipping_line_name", "shipping_line_address", "telephone", "import_email", "export_email", "releases_email", "accounting_email") VALUES (E'f16cfda9-ba12-41ce-b272-d8d7887d8ebf', NULL, E'Maersk', E'Maersk A/S\nEsplanaden 50\n1263 Copenhagen K\nDenmark', E'', ARRAY['gb.import@maersk.com'], ARRAY[], ARRAY['gb.import@maersk.com'], ARRAY['gb.collections@maersk.com']);
INSERT INTO shipping_lines ("id", "created_by", "shipping_line_name", "shipping_line_address", "telephone", "import_email", "export_email", "releases_email", "accounting_email") VALUES (E'53e47b66-80fc-4840-9b2f-ec3c844bc57e', NULL, E'Cosco Shipping Lines', E'China Shipping House\nWalton Avenue\nFelixstowe\nSuffolk\nIP11 3HG', E'01394 608384', ARRAY['deliveries@coscoshipping.co.uk'], ARRAY['deliveries@coscoshipping.co.uk'], ARRAY['Releases@coscoshipping.co.uk'], ARRAY['creditcontrol@coscoshipping.co.uk']);

