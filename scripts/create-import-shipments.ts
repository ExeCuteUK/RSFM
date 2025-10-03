import { db } from "../server/db";
import { importShipments, importCustomers } from "../shared/schema";
import { eq } from "drizzle-orm";

async function createImportShipments() {
  console.log("Creating 10 import shipments with proper form validation...");

  // Get some import customers
  const customers = await db.select().from(importCustomers).limit(10);
  
  if (customers.length < 10) {
    console.error("Not enough import customers in database");
    return;
  }

  const shipments = [
    {
      customerId: customers[0].id,
      bookingDate: "2025-10-01",
      collectionDate: "2025-10-05",
      portOfArrival: "Felixstowe",
      trailerOrContainerNumber: "MSCU1234567",
      departureCountry: "China",
      incoterms: "CIF",
      containerShipment: "20ft",
      commodity: "Conveyor Belt Materials",
      status: "Booking Confirmed"
    },
    {
      customerId: customers[1].id,
      bookingDate: "2025-10-02",
      collectionDate: "2025-10-08",
      portOfArrival: "Southampton",
      trailerOrContainerNumber: "TEMU5678901",
      departureCountry: "Ghana",
      incoterms: "FOB",
      containerShipment: "40ft",
      commodity: "Agricultural Products",
      status: "Vessel Departed"
    },
    {
      customerId: customers[2].id,
      bookingDate: "2025-09-28",
      collectionDate: "2025-10-02",
      portOfArrival: "London Gateway",
      trailerOrContainerNumber: "HLBU9876543",
      departureCountry: "Netherlands",
      incoterms: "DDP",
      containerShipment: "20ft",
      commodity: "Industrial Equipment",
      status: "Arrived at Port"
    },
    {
      customerId: customers[3].id,
      bookingDate: "2025-10-03",
      collectionDate: "2025-10-10",
      portOfArrival: "Felixstowe",
      trailerOrContainerNumber: "CSNU2468135",
      departureCountry: "Italy",
      incoterms: "EXW",
      containerShipment: "40ft HC",
      commodity: "Packaging Materials",
      status: "Booking Confirmed"
    },
    {
      customerId: customers[4].id,
      bookingDate: "2025-09-30",
      collectionDate: "2025-10-04",
      portOfArrival: "Liverpool",
      trailerOrContainerNumber: "MAEU3698521",
      departureCountry: "USA",
      incoterms: "CFR",
      containerShipment: "20ft",
      commodity: "Hydraulic Components",
      status: "In Transit"
    },
    {
      customerId: customers[5].id,
      bookingDate: "2025-10-04",
      collectionDate: "2025-10-12",
      portOfArrival: "Felixstowe",
      trailerOrContainerNumber: "OOLU1357924",
      departureCountry: "Brazil",
      incoterms: "CIF",
      containerShipment: "40ft",
      commodity: "Coffee Beans",
      status: "Booking Confirmed"
    },
    {
      customerId: customers[6].id,
      bookingDate: "2025-10-01",
      collectionDate: "2025-10-07",
      portOfArrival: "Southampton",
      trailerOrContainerNumber: "TCLU4682013",
      departureCountry: "Turkey",
      incoterms: "FOB",
      containerShipment: "40ft HC",
      commodity: "Textile Products",
      status: "Vessel Departed"
    },
    {
      customerId: customers[7].id,
      bookingDate: "2025-09-29",
      collectionDate: "2025-10-03",
      portOfArrival: "London Gateway",
      trailerOrContainerNumber: "CMAU8520147",
      departureCountry: "Germany",
      incoterms: "DDP",
      containerShipment: "20ft",
      commodity: "Fluid Control Systems",
      status: "Arrived at Port"
    },
    {
      customerId: customers[8].id,
      bookingDate: "2025-10-02",
      collectionDate: "2025-10-09",
      portOfArrival: "Felixstowe",
      trailerOrContainerNumber: "MSCU7531596",
      departureCountry: "India",
      incoterms: "CIF",
      containerShipment: "40ft",
      commodity: "Home Decor Items",
      status: "In Transit"
    },
    {
      customerId: customers[9].id,
      bookingDate: "2025-10-05",
      collectionDate: "2025-10-11",
      portOfArrival: "Liverpool",
      trailerOrContainerNumber: "TEMU1592637",
      departureCountry: "Spain",
      incoterms: "CFR",
      containerShipment: "20ft",
      commodity: "Scientific Equipment",
      status: "Booking Confirmed"
    }
  ];

  for (let i = 0; i < shipments.length; i++) {
    const shipment = shipments[i];
    const customer = customers[i];
    
    // Mimic form logic: get customer defaults
    const rsToClear = customer.rsProcessCustomsClearance ?? false;
    const customsClearanceAgent = customer.agentInDover || null;
    const deliveryAddress = customer.defaultDeliveryAddress || null;
    const supplierName = customer.defaultSuppliersName || null;
    
    const insertData = {
      jobType: "import" as const,
      status: shipment.status,
      importCustomerId: shipment.customerId,
      bookingDate: shipment.bookingDate,
      collectionDate: shipment.collectionDate,
      dispatchDate: null,
      deliveryDate: null,
      deliveryTime: null,
      deliveryReference: null,
      deliveryTimeNotes: null,
      proofOfDelivery: [], // Array
      importDateEtaPort: null,
      portOfArrival: shipment.portOfArrival,
      trailerOrContainerNumber: shipment.trailerOrContainerNumber,
      departureCountry: shipment.departureCountry,
      containerShipment: shipment.containerShipment,
      handoverContainerAtPort: false,
      vesselName: null,
      shippingLine: null,
      deliveryRelease: null,
      incoterms: shipment.incoterms,
      numberOfPieces: null,
      packaging: null,
      weight: null,
      cube: null,
      goodsDescription: shipment.commodity,
      invoiceValue: null,
      freightCharge: null,
      clearanceCharge: null,
      currency: null,
      freightRateOut: null,
      exportCustomsClearanceCharge: null,
      additionalCommodityCodes: 1,
      additionalCommodityCodeCharge: null,
      expensesToChargeOut: [], // Array
      currencyIn: "GBP",
      haulierFreightRateIn: null,
      exportClearanceChargeIn: null,
      destinationClearanceCostIn: null,
      additionalExpensesIn: [], // Array
      haulierName: null,
      haulierContactName: [], // Array (form default)
      haulierEmail: [], // Array (form default)
      haulierTelephone: null,
      haulierReference: null,
      vatZeroRated: false,
      clearanceType: null,
      customsClearanceAgent: customsClearanceAgent,
      rsToClear: rsToClear,
      clearanceStatusIndicator: 1,
      deliveryBookedStatusIndicator: 1,
      haulierBookingStatusIndicator: 1,
      containerReleaseStatusIndicator: 1,
      invoiceCustomerStatusIndicator: 1,
      sendPodToCustomerStatusIndicator: 1,
      customerReferenceNumber: null,
      deliveryAddress: deliveryAddress,
      supplierName: supplierName,
      collectionAddress: null,
      collectionContactName: null,
      collectionContactTelephone: null,
      collectionContactEmail: null,
      collectionReference: null,
      collectionNotes: null,
      additionalNotes: null,
      jobTags: [], // Array
      attachments: [], // Array
    };

    const result = await db.insert(importShipments).values(insertData).returning();
    console.log(`Created import shipment #${result[0].jobRef} for ${customer.companyName}`);
  }

  console.log("✓ Successfully created 10 import shipments");
}

createImportShipments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
