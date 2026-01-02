#!/usr/bin/env node
/**
 * Seed Demo Data Script
 * 
 * Creates the database, containers, and populates with a full year of realistic
 * demo data (2025 + January 2026) for local development and demonstrations.
 * 
 * Usage:
 *   npm run seed:demo          # Seed demo data (skips if data exists)
 *   npm run seed:reset         # Clear all data and re-seed
 * 
 * Requirements:
 *   - Cosmos DB emulator running (docker compose up -d)
 *   - Wait 60-90 seconds for emulator to initialise on first run
 * 
 * Demo Login:
 *   Email: demo@example.com
 *   Password: Demo123!
 */

// Disable TLS verification for local emulator's self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { CosmosClient } = require('@azure/cosmos');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// =============================================================================
// Configuration
// =============================================================================

const CONNECTION_STRING = process.env.COSMOS_DB_CONNECTION_STRING || 
  'AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
const DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME || 'appdb';

const RESET_MODE = process.argv.includes('--reset');

// Container configurations with partition keys
const CONTAINERS = [
  { name: 'users', partitionKey: '/id' },
  { name: 'clients', partitionKey: '/id' },
  { name: 'register', partitionKey: '/date' },
  { name: 'invoices', partitionKey: '/clientId' },
  { name: 'settings', partitionKey: '/id' },
  { name: 'incidents', partitionKey: '/clientId' },
  { name: 'client-notes', partitionKey: '/clientId' },
  { name: 'staff', partitionKey: '/id' },
  { name: 'staff-register', partitionKey: '/date' },
  { name: 'registrations', partitionKey: '/id' },
];

// =============================================================================
// Helper Functions
// =============================================================================

function log(message, emoji = '📝') {
  console.log(`${emoji} ${message}`);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getWorkingDays(startDate, endDate) {
  const days = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Monday = 1, Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getDayOfWeekName(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date(date).getDay()];
}

function generateInvoiceCode(date, firstName, surname) {
  const d = new Date(date);
  const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const initials = `${firstName.substring(0, 2)}${surname.substring(0, 2)}`;
  return `${yearMonth}-${initials}`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =============================================================================
// Demo Data Definitions
// =============================================================================

// Users
const USERS = [
  {
    id: uuidv4(),
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'admin',
    password: 'Demo123!',
  },
  {
    id: uuidv4(),
    email: 'sarah.wilson@example.com',
    firstName: 'Sarah',
    lastName: 'Wilson',
    role: 'worker',
    password: 'Worker123!',
  },
  {
    id: uuidv4(),
    email: 'james.taylor@example.com',
    firstName: 'James',
    lastName: 'Taylor',
    role: 'worker',
    password: 'Worker123!',
  },
];

// Clients - diverse mix to demonstrate all features
const CLIENTS = [
  {
    firstName: 'Margaret',
    surname: 'Thompson',
    dateOfBirth: '1952-03-15',
    contactNumber: '07700 900123',
    email: 'margaret.thompson@email.co.uk',
    addressLine1: '42 Oak Tree Lane',
    addressLine2: '',
    addressLine3: 'Wilmslow',
    addressLine4: 'Cheshire',
    postcode: 'SK9 1AA',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['monday', 'wednesday', 'friday'],
    isActive: true,
    startDate: '2024-06-01', // Pre-existing client
    importantInfo: 'Prefers to sit near the window. Tea with milk, no sugar.',
    emergencyContact: { name: 'Peter Thompson', relationship: 'Husband', phoneNumber: '07700 900124', email: 'peter.thompson@email.co.uk' },
  },
  {
    firstName: 'John',
    surname: 'Hughes',
    dateOfBirth: '1948-11-22',
    contactNumber: '07700 900125',
    email: 'john.hughes@email.co.uk',
    addressLine1: '15 Maple Avenue',
    addressLine2: 'Flat 3',
    addressLine3: 'Stockport',
    addressLine4: 'Greater Manchester',
    postcode: 'SK3 8BQ',
    rate: 36,
    paymentMethod: 'cash',
    attendingDays: ['tuesday', 'thursday'],
    isActive: true,
    startDate: '2024-09-01',
    importantInfo: 'Hard of hearing - speak clearly. Enjoys puzzles and word games.',
    emergencyContact: { name: 'Susan Hughes', relationship: 'Daughter', phoneNumber: '07700 900126' },
  },
  {
    firstName: 'Dorothy',
    surname: 'Evans',
    dateOfBirth: '1945-07-08',
    contactNumber: '07700 900127',
    email: 'dorothy.evans@email.co.uk',
    addressLine1: '8 Church Street',
    addressLine2: '',
    addressLine3: 'Altrincham',
    addressLine4: 'Greater Manchester',
    postcode: 'WA14 1DP',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    isActive: true,
    startDate: '2024-01-15',
    importantInfo: 'Diabetic - needs lunch at 12:30 sharp. Very sociable.',
    emergencyContact: { name: 'Michael Evans', relationship: 'Son', phoneNumber: '07700 900128', email: 'm.evans@work.com' },
    // Uses separate billing address
    useSeparateBillingAddress: true,
    billingAddress: {
      line1: 'Evans & Co Accountants',
      line2: '45 Business Park',
      line3: 'Manchester',
      line4: 'Greater Manchester',
      postcode: 'M2 4WU',
    },
    invoiceEmail: 'accounts@evansco.com',
  },
  {
    firstName: 'Arthur',
    surname: 'Williams',
    dateOfBirth: '1950-02-28',
    contactNumber: '07700 900129',
    email: 'arthur.w@email.co.uk',
    addressLine1: '29 Station Road',
    addressLine2: '',
    addressLine3: 'Macclesfield',
    addressLine4: 'Cheshire',
    postcode: 'SK10 1AB',
    rate: 36,
    paymentMethod: 'invoice',
    attendingDays: ['monday', 'wednesday'],
    isActive: true,
    startDate: '2025-03-01', // Started mid-year - shows growth
    importantInfo: 'Ex-engineer, loves talking about trains.',
    emergencyContact: { name: 'June Williams', relationship: 'Wife', phoneNumber: '07700 900130' },
  },
  {
    firstName: 'Edith',
    surname: 'Brown',
    dateOfBirth: '1943-12-01',
    contactNumber: '07700 900131',
    email: 'edith.brown@email.co.uk',
    addressLine1: '7 Rose Cottage',
    addressLine2: 'Mill Lane',
    addressLine3: 'Knutsford',
    addressLine4: 'Cheshire',
    postcode: 'WA16 6AA',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['tuesday', 'thursday', 'friday'],
    isActive: true,
    startDate: '2024-04-01',
    importantInfo: 'Mobility issues - uses walking frame. Very independent.',
    emergencyContact: { name: 'Care Agency', relationship: 'Carer', phoneNumber: '0161 123 4567' },
    // Uses separate correspondence address
    useSeparateCorrespondenceAddress: true,
    correspondenceAddress: {
      line1: 'c/o Brown Family',
      line2: '123 Main Street',
      line3: 'London',
      line4: '',
      postcode: 'SW1A 1AA',
    },
  },
  {
    firstName: 'Harold',
    surname: 'Clark',
    dateOfBirth: '1947-05-19',
    contactNumber: '07700 900132',
    email: 'harold.clark@email.co.uk',
    addressLine1: '55 Victoria Street',
    addressLine2: '',
    addressLine3: 'Sale',
    addressLine4: 'Greater Manchester',
    postcode: 'M33 7XY',
    rate: 36,
    paymentMethod: 'cash',
    attendingDays: ['wednesday', 'friday'],
    isActive: true,
    startDate: '2024-08-01',
    importantInfo: 'Quiet and reserved. Enjoys reading newspapers.',
    emergencyContact: { name: 'Mary Clark', relationship: 'Sister', phoneNumber: '07700 900133' },
  },
  {
    firstName: 'Gladys',
    surname: 'Robinson',
    dateOfBirth: '1940-09-30',
    contactNumber: '07700 900134',
    email: 'gladys.r@email.co.uk',
    addressLine1: '12 Park View',
    addressLine2: '',
    addressLine3: 'Cheadle',
    addressLine4: 'Greater Manchester',
    postcode: 'SK8 1PL',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['monday', 'tuesday', 'thursday'],
    isActive: true,
    startDate: '2024-02-01',
    importantInfo: 'Former teacher. Loves helping others with activities.',
    emergencyContact: { name: 'Robert Robinson', relationship: 'Nephew', phoneNumber: '07700 900135', email: 'rob.robinson@email.com' },
  },
  {
    firstName: 'Ronald',
    surname: 'Walker',
    dateOfBirth: '1951-04-12',
    contactNumber: '07700 900136',
    email: 'ron.walker@email.co.uk',
    addressLine1: '88 High Street',
    addressLine2: 'Apartment 2B',
    addressLine3: 'Bramhall',
    addressLine4: 'Greater Manchester',
    postcode: 'SK7 1AW',
    rate: 36,
    paymentMethod: 'invoice',
    attendingDays: ['tuesday', 'wednesday', 'thursday', 'friday'],
    isActive: true,
    startDate: '2025-06-01', // Started mid-year
    importantInfo: 'Recently widowed. Needs extra support settling in.',
    emergencyContact: { name: 'Dr. Sarah Walker', relationship: 'Daughter', phoneNumber: '07700 900137' },
  },
  {
    firstName: 'Betty',
    surname: 'Hall',
    dateOfBirth: '1946-01-25',
    contactNumber: '07700 900138',
    email: 'betty.hall@email.co.uk',
    addressLine1: '3 The Crescent',
    addressLine2: '',
    addressLine3: 'Hale',
    addressLine4: 'Greater Manchester',
    postcode: 'WA15 9QE',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['monday', 'friday'],
    isActive: true,
    startDate: '2024-11-01',
    importantInfo: 'Allergic to nuts. Check all food items.',
    emergencyContact: { name: 'Thomas Hall', relationship: 'Husband', phoneNumber: '07700 900139' },
  },
  {
    firstName: 'Frank',
    surname: 'Lewis',
    dateOfBirth: '1949-08-17',
    contactNumber: '07700 900140',
    email: 'frank.lewis@email.co.uk',
    addressLine1: '21 Beech Road',
    addressLine2: '',
    addressLine3: 'Poynton',
    addressLine4: 'Cheshire',
    postcode: 'SK12 1AA',
    rate: 36,
    paymentMethod: 'cash',
    attendingDays: ['monday', 'thursday'],
    isActive: true,
    startDate: '2024-07-01',
    importantInfo: 'Veteran - enjoys sharing stories. Prefers male carers.',
    emergencyContact: { name: 'Emily Lewis', relationship: 'Granddaughter', phoneNumber: '07700 900141' },
  },
  {
    firstName: 'Vera',
    surname: 'Young',
    dateOfBirth: '1944-06-03',
    contactNumber: '07700 900142',
    email: 'vera.young@email.co.uk',
    addressLine1: '67 Garden Lane',
    addressLine2: '',
    addressLine3: 'Didsbury',
    addressLine4: 'Greater Manchester',
    postcode: 'M20 2AB',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['wednesday', 'thursday', 'friday'],
    isActive: false, // INACTIVE - demonstrates churn
    startDate: '2024-03-01',
    endDate: '2025-08-31',
    importantInfo: 'Moved to care home in August 2025.',
    emergencyContact: { name: 'Care Home', relationship: 'Care Home', phoneNumber: '0161 987 6543' },
  },
  {
    firstName: 'Norman',
    surname: 'King',
    dateOfBirth: '1953-10-09',
    contactNumber: '07700 900143',
    email: 'norman.king@email.co.uk',
    addressLine1: '44 Riverside Drive',
    addressLine2: '',
    addressLine3: 'Marple',
    addressLine4: 'Greater Manchester',
    postcode: 'SK6 7AB',
    rate: 36,
    paymentMethod: 'invoice',
    attendingDays: ['monday', 'tuesday'],
    isActive: false, // INACTIVE
    startDate: '2024-05-01',
    endDate: '2025-04-30',
    importantInfo: 'Relocated to be closer to family.',
    emergencyContact: { name: 'Janet King', relationship: 'Wife', phoneNumber: '07700 900144' },
  },
  {
    firstName: 'Iris',
    surname: 'Mitchell',
    dateOfBirth: '1955-11-28',
    contactNumber: '07700 900145',
    email: 'iris.mitchell@email.co.uk',
    addressLine1: '9 Hillside Close',
    addressLine2: '',
    addressLine3: 'Hazel Grove',
    addressLine4: 'Greater Manchester',
    postcode: 'SK7 5NP',
    rate: 40,
    paymentMethod: 'invoice',
    attendingDays: ['tuesday', 'friday'],
    isActive: true,
    startDate: '2025-09-01', // Very recent - shows continued growth
    importantInfo: 'New client. Getting to know preferences.',
    emergencyContact: { name: 'David Mitchell', relationship: 'Son', phoneNumber: '07700 900146' },
  },
];

// Staff members
const STAFF = [
  {
    firstName: 'Emma',
    lastName: 'Johnson',
    email: 'emma.johnson@staff.example.com',
    phoneNumber: '07800 100001',
    dayRate: 150,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    isActive: true,
    notes: 'Lead carer. First aid trained.',
    linkToUserId: null, // Will be linked to a user
  },
  {
    firstName: 'David',
    lastName: 'Smith',
    email: 'david.smith@staff.example.com',
    phoneNumber: '07800 100002',
    dayRate: 130,
    workingDays: ['monday', 'wednesday', 'friday'],
    isActive: true,
    notes: 'Part-time. Available for extra shifts.',
  },
  {
    firstName: 'Lisa',
    lastName: 'Brown',
    email: 'lisa.brown@staff.example.com',
    phoneNumber: '07800 100003',
    dayRate: 140,
    workingDays: ['tuesday', 'thursday'],
    isActive: true,
    notes: 'Activities coordinator. Creative arts specialist.',
  },
  {
    firstName: 'Mark',
    lastName: 'Taylor',
    email: 'mark.taylor@staff.example.com',
    phoneNumber: '07800 100004',
    dayRate: 120,
    workingDays: ['monday', 'tuesday', 'wednesday'],
    isActive: false, // Left mid-year
    notes: 'Left June 2025 - relocated.',
  },
];

// Business settings
const SETTINGS = {
  id: 'app-settings',
  business: {
    name: 'Sunshine Day Centre',
    addressLine1: '100 Community Way',
    addressLine2: '',
    city: 'Manchester',
    county: 'Greater Manchester',
    postcode: 'M1 2AB',
  },
  bank: {
    accountName: 'Sunshine Day Centre Ltd',
    bankName: 'Barclays Bank',
    sortCode: '20-00-00',
    accountNumber: '12345678',
  },
  rates: {
    standard: 40,
    reduced: 36,
  },
};

// =============================================================================
// Data Generation Functions
// =============================================================================

async function createUsers(container) {
  log('Creating users...', '👥');
  const createdUsers = [];
  
  for (const userData of USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const now = new Date().toISOString();
    
    const user = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      passwordHash,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    
    await container.items.create(user);
    createdUsers.push(user);
    log(`  Created ${userData.role}: ${userData.email}`, '  ✓');
  }
  
  return createdUsers;
}

async function createClients(container) {
  log('Creating clients...', '👤');
  const createdClients = [];
  
  for (const clientData of CLIENTS) {
    const now = new Date().toISOString();
    const startDate = clientData.startDate || '2024-01-01';
    
    const client = {
      id: uuidv4(),
      firstName: clientData.firstName,
      surname: clientData.surname,
      concatName: `${clientData.firstName} ${clientData.surname}`,
      dateOfBirth: clientData.dateOfBirth,
      contactNumber: clientData.contactNumber,
      email: clientData.email,
      addressLine1: clientData.addressLine1,
      addressLine2: clientData.addressLine2 || '',
      addressLine3: clientData.addressLine3,
      addressLine4: clientData.addressLine4,
      postcode: clientData.postcode,
      billingAddress: clientData.billingAddress,
      useSeparateBillingAddress: clientData.useSeparateBillingAddress || false,
      correspondenceAddress: clientData.correspondenceAddress,
      useSeparateCorrespondenceAddress: clientData.useSeparateCorrespondenceAddress || false,
      invoiceEmail: clientData.invoiceEmail,
      emergencyContact: clientData.emergencyContact,
      rate: clientData.rate,
      notes: '',
      importantInfo: clientData.importantInfo || '',
      attendingDays: clientData.attendingDays,
      paymentMethod: clientData.paymentMethod,
      isActive: clientData.isActive,
      createdAt: new Date(startDate).toISOString(),
      updatedAt: now,
      // Store start/end for register generation
      _startDate: startDate,
      _endDate: clientData.endDate,
    };
    
    await container.items.create(client);
    createdClients.push(client);
    log(`  Created client: ${client.concatName} (${client.isActive ? 'active' : 'inactive'})`, '  ✓');
  }
  
  return createdClients;
}

async function createRegisterEntries(container, clients, users) {
  log('Creating register entries (this may take a moment)...', '📋');
  
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2026-01-31');
  const workingDays = getWorkingDays(startDate, endDate);
  
  const adminUser = users.find(u => u.role === 'admin');
  let totalEntries = 0;
  let lateCancellations = 0;
  let cashOwedEntries = 0;
  
  // Process in batches to avoid memory issues
  const batchSize = 100;
  let batch = [];
  
  for (const dateStr of workingDays) {
    const dayName = getDayOfWeekName(dateStr);
    const date = new Date(dateStr);
    
    for (const client of clients) {
      // Check if client was active on this date
      const clientStart = new Date(client._startDate);
      const clientEnd = client._endDate ? new Date(client._endDate) : new Date('2099-12-31');
      
      if (date < clientStart || date > clientEnd) continue;
      if (!client.attendingDays.includes(dayName)) continue;
      
      // Determine attendance - 95% present, 3% late-cancellation, 2% absent
      const roll = Math.random();
      let attendanceStatus = 'present';
      let attended = true;
      
      if (roll > 0.98) {
        attendanceStatus = 'absent';
        attended = false;
      } else if (roll > 0.95) {
        attendanceStatus = 'late-cancellation';
        attended = false;
        lateCancellations++;
      }
      
      // Payment - invoice clients get invoiced, cash clients pay cash
      // Occasionally a cash client has delayed payment (cashOwed)
      let payment = (attendanceStatus === 'absent') ? 0 : client.rate;
      let paymentType = client.paymentMethod === 'cash' ? 'cash' : 'invoice';
      let cashOwed = 0;
      
      // 5% chance of cash client having delayed payment
      if (paymentType === 'cash' && payment > 0 && Math.random() < 0.05) {
        cashOwed = payment;
        payment = 0;
        cashOwedEntries++;
      }
      
      const entry = {
        id: uuidv4(),
        clientId: client.id,
        clientName: client.concatName,
        date: dateStr,
        attendanceStatus,
        attended,
        payment,
        paymentType,
        invoiceCode: generateInvoiceCode(dateStr, client.firstName, client.surname),
        notes: '',
        cashOwed: cashOwed > 0 ? cashOwed : undefined,
        cashOwedPaidDate: cashOwed > 0 && Math.random() > 0.3 ? 
          formatDate(new Date(date.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000)) : undefined,
        createdAt: new Date(dateStr + 'T10:00:00Z').toISOString(),
        createdBy: adminUser.id,
      };
      
      batch.push(entry);
      totalEntries++;
      
      // Create batch
      if (batch.length >= batchSize) {
        await Promise.all(batch.map(e => container.items.create(e)));
        batch = [];
        process.stdout.write(`\r  Processing: ${totalEntries} entries...`);
      }
    }
  }
  
  // Final batch
  if (batch.length > 0) {
    await Promise.all(batch.map(e => container.items.create(e)));
  }
  
  console.log('');
  log(`  Created ${totalEntries} register entries`, '  ✓');
  log(`  (${lateCancellations} late-cancellations, ${cashOwedEntries} with cash owed)`, '  ℹ');
  
  return totalEntries;
}

async function createInvoices(container, clients, registerContainer) {
  log('Creating invoices...', '💷');
  
  // Get all invoice-paying clients
  const invoiceClients = clients.filter(c => c.paymentMethod === 'invoice');
  let totalInvoices = 0;
  
  // Generate invoices for each month from Jan 2025 to Jan 2026
  const months = [];
  for (let year = 2025; year <= 2026; year++) {
    const maxMonth = year === 2026 ? 1 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      months.push({ year, month });
    }
  }
  
  for (const { year, month } of months) {
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const invoiceDate = periodEnd;
    const dueDate = formatDate(new Date(new Date(periodEnd).getTime() + 30 * 24 * 60 * 60 * 1000));
    
    for (const client of invoiceClients) {
      // Check if client was active during this period
      const clientStart = new Date(client._startDate);
      const clientEnd = client._endDate ? new Date(client._endDate) : new Date('2099-12-31');
      const periodStartDate = new Date(periodStart);
      const periodEndDate = new Date(periodEnd);
      
      if (periodEndDate < clientStart || periodStartDate > clientEnd) continue;
      
      // Query register entries for this client in this period
      const { resources: entries } = await registerContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.clientId = @clientId AND c.date >= @start AND c.date <= @end AND c.paymentType = "invoice" AND c.payment > 0',
          parameters: [
            { name: '@clientId', value: client.id },
            { name: '@start', value: periodStart },
            { name: '@end', value: periodEnd },
          ],
        })
        .fetchAll();
      
      if (entries.length === 0) continue;
      
      // Build line items
      const lineItems = entries.map(e => ({
        date: e.date,
        description: e.attendanceStatus === 'late-cancellation' 
          ? 'Late cancellation fee' 
          : 'Day centre attendance',
        amount: e.payment,
      }));
      
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      
      // Determine status based on month
      let status = 'paid';
      let paidDate = formatDate(new Date(new Date(dueDate).getTime() - randomInt(1, 20) * 24 * 60 * 60 * 1000));
      
      if (year === 2026) {
        status = 'draft';
        paidDate = undefined;
      } else if (year === 2025 && month === 12) {
        // December - mix of sent and overdue
        if (Math.random() < 0.3) {
          status = 'overdue';
          paidDate = undefined;
        } else {
          status = 'sent';
          paidDate = undefined;
        }
      } else if (year === 2025 && month === 11) {
        // November - mostly paid, some sent
        if (Math.random() < 0.2) {
          status = 'sent';
          paidDate = undefined;
        }
      }
      
      const invoiceNumber = generateInvoiceCode(periodEnd, client.firstName, client.surname);
      
      const billingAddress = client.useSeparateBillingAddress && client.billingAddress 
        ? client.billingAddress 
        : {
            line1: client.addressLine1,
            line2: client.addressLine2,
            line3: client.addressLine3,
            line4: client.addressLine4,
            postcode: client.postcode,
          };
      
      const invoice = {
        id: uuidv4(),
        invoiceNumber,
        clientId: client.id,
        clientName: client.concatName,
        billingAddress,
        billingEmail: client.invoiceEmail || client.email,
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        lineItems,
        subtotal,
        total: subtotal,
        status,
        paidDate,
        notes: '',
        createdAt: new Date(invoiceDate + 'T12:00:00Z').toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await container.items.create(invoice);
      totalInvoices++;
    }
    
    process.stdout.write(`\r  Processing: ${year}-${String(month).padStart(2, '0')} (${totalInvoices} invoices)...`);
  }
  
  console.log('');
  log(`  Created ${totalInvoices} invoices`, '  ✓');
  
  return totalInvoices;
}

async function createSettings(container) {
  log('Creating settings...', '⚙️');
  
  const settings = {
    ...SETTINGS,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };
  
  await container.items.create(settings);
  log(`  Created business settings: ${settings.business.name}`, '  ✓');
}

async function createIncidents(container, clients, users) {
  log('Creating incidents...', '⚠️');
  
  const adminUser = users.find(u => u.role === 'admin');
  const activeClients = clients.filter(c => c.isActive);
  
  const incidents = [
    { clientIndex: 0, date: '2025-02-15', severity: 'low', description: 'Minor slip in bathroom, no injury', actionTaken: 'Incident form completed. Reminded about wet floor signs.', status: 'resolved' },
    { clientIndex: 1, date: '2025-03-22', severity: 'medium', description: 'Disagreement with another client during activity', actionTaken: 'Staff intervened. Both clients separated and calmed. Discussed with family.', status: 'resolved' },
    { clientIndex: 2, date: '2025-04-10', severity: 'high', description: 'Blood sugar dropped significantly before lunch', actionTaken: 'Administered glucose tablets. Called emergency contact. Monitored closely for rest of day.', status: 'resolved', followUpRequired: true, followUpNotes: 'Review lunch timing with family' },
    { clientIndex: 3, date: '2025-05-18', severity: 'low', description: 'Lost personal item (scarf)', actionTaken: 'Searched premises. Item found next day.', status: 'resolved' },
    { clientIndex: 4, date: '2025-06-25', severity: 'medium', description: 'Appeared confused and disorientated in afternoon', actionTaken: 'Kept calm and reassured. GP appointment recommended.', status: 'resolved' },
    { clientIndex: 5, date: '2025-07-14', severity: 'low', description: 'Declined lunch, seemed upset', actionTaken: 'Had quiet chat. Found out worried about home situation. Offered support.', status: 'resolved' },
    { clientIndex: 0, date: '2025-08-30', severity: 'low', description: 'Medication query - unclear if morning dose taken', actionTaken: 'Contacted family to verify. Medication chart updated.', status: 'resolved' },
    { clientIndex: 1, date: '2025-09-12', severity: 'medium', description: 'Hearing aid malfunction caused distress', actionTaken: 'Staff assisted with replacement batteries. Contacted audiologist for check-up.', status: 'resolved' },
    { clientIndex: 2, date: '2025-10-05', severity: 'low', description: 'Small scratch from craft activity', actionTaken: 'First aid applied. No further action needed.', status: 'resolved' },
    { clientIndex: 3, date: '2025-11-20', severity: 'medium', description: 'Verbal outburst, out of character', actionTaken: 'Gently redirected to quiet area. Later apologised, mentioned sleep issues at home.', status: 'resolved' },
    { clientIndex: 4, date: '2025-12-08', severity: 'high', description: 'Fall in car park on arrival', actionTaken: 'Ice on ground. First aid applied to grazed knee. Incident logged. Salt ordered for paths.', status: 'open', followUpRequired: true, followUpNotes: 'Arrange ice/snow protocol review' },
    { clientIndex: 6, date: '2026-01-10', severity: 'medium', description: 'Reported feeling unwell after lunch', actionTaken: 'Monitored closely. Rested in quiet room. Symptoms passed within an hour.', status: 'open', followUpRequired: true, followUpNotes: 'Check food allergies in file' },
  ];
  
  for (const inc of incidents) {
    const client = activeClients[inc.clientIndex % activeClients.length];
    
    const incident = {
      id: uuidv4(),
      clientId: client.id,
      clientName: client.concatName,
      date: inc.date,
      time: `${randomInt(9, 15)}:${String(randomInt(0, 59)).padStart(2, '0')}`,
      description: inc.description,
      actionTaken: inc.actionTaken,
      reportedBy: adminUser.id,
      reportedByName: `${adminUser.firstName} ${adminUser.lastName}`,
      witnesses: Math.random() > 0.5 ? ['Staff member'] : undefined,
      severity: inc.severity,
      followUpRequired: inc.followUpRequired || false,
      followUpNotes: inc.followUpNotes,
      status: inc.status,
      createdAt: new Date(inc.date + 'T16:00:00Z').toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await container.items.create(incident);
  }
  
  log(`  Created ${incidents.length} incidents`, '  ✓');
}

async function createClientNotes(container, clients, users) {
  log('Creating client notes...', '📝');
  
  const adminUser = users.find(u => u.role === 'admin');
  const workerUser = users.find(u => u.role === 'worker');
  const activeClients = clients.filter(c => c.isActive);
  
  const noteTypes = ['general', 'requirements', 'preferences', 'billing', 'feedback', 'follow_up'];
  const noteTemplates = {
    general: ['Had a great day today', 'Seemed quieter than usual', 'Very chatty and sociable', 'Enjoyed the music session'],
    requirements: ['Needs assistance with stairs', 'Requires supervision for hot drinks', 'Must sit in well-lit area'],
    preferences: ['Prefers tea to coffee', 'Likes to sit near the garden', 'Enjoys crossword puzzles', 'Prefers smaller group activities'],
    billing: ['Payment received - thank you', 'Invoice address confirmed', 'Direct debit set up'],
    feedback: ['Family very pleased with care', 'Requested more outdoor activities', 'Thanked staff for patience'],
    follow_up: ['GP appointment next week', 'Family visit scheduled', 'Review care plan next month'],
  };
  
  let noteCount = 0;
  
  for (const client of activeClients) {
    // 2-4 notes per client
    const numNotes = randomInt(2, 4);
    
    for (let i = 0; i < numNotes; i++) {
      const noteType = randomChoice(noteTypes);
      const content = randomChoice(noteTemplates[noteType]);
      const author = Math.random() > 0.5 ? adminUser : workerUser;
      const daysAgo = randomInt(1, 300);
      const createdDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      const note = {
        id: uuidv4(),
        clientId: client.id,
        noteType,
        title: noteType.charAt(0).toUpperCase() + noteType.slice(1).replace('_', ' '),
        content,
        createdBy: author.id,
        createdByName: `${author.firstName} ${author.lastName}`,
        createdAt: createdDate.toISOString(),
        updatedAt: createdDate.toISOString(),
        isActive: true,
      };
      
      await container.items.create(note);
      noteCount++;
    }
  }
  
  log(`  Created ${noteCount} client notes`, '  ✓');
}

async function createStaff(container, users) {
  log('Creating staff members...', '👷');
  const createdStaff = [];
  
  // Link first staff member to a worker user for self-check-in demo
  const workerUser = users.find(u => u.role === 'worker');
  STAFF[0].linkToUserId = workerUser?.id;
  
  for (const staffData of STAFF) {
    const now = new Date().toISOString();
    
    const staff = {
      id: uuidv4(),
      userId: staffData.linkToUserId,
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      concatName: `${staffData.firstName} ${staffData.lastName}`,
      email: staffData.email,
      phoneNumber: staffData.phoneNumber,
      dayRate: staffData.dayRate,
      workingDays: staffData.workingDays,
      notes: staffData.notes,
      isActive: staffData.isActive,
      createdAt: now,
      updatedAt: now,
    };
    
    await container.items.create(staff);
    createdStaff.push(staff);
    log(`  Created staff: ${staff.concatName} (${staff.isActive ? 'active' : 'left'})`, '  ✓');
  }
  
  return createdStaff;
}

async function createStaffRegister(container, staff, users) {
  log('Creating staff register entries...', '📋');
  
  const adminUser = users.find(u => u.role === 'admin');
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2026-01-31');
  const workingDays = getWorkingDays(startDate, endDate);
  
  let totalEntries = 0;
  const batchSize = 100;
  let batch = [];
  
  for (const dateStr of workingDays) {
    const dayName = getDayOfWeekName(dateStr);
    const date = new Date(dateStr);
    
    for (const staffMember of staff) {
      // Check if staff was active on this date
      // Mark Taylor left in June 2025
      if (!staffMember.isActive && date > new Date('2025-06-30')) continue;
      if (!staffMember.workingDays.includes(dayName)) continue;
      
      // 98% attendance for staff
      if (Math.random() > 0.98) continue;
      
      const entry = {
        id: uuidv4(),
        staffId: staffMember.id,
        staffName: staffMember.concatName,
        date: dateStr,
        dayRate: staffMember.dayRate,
        notes: '',
        createdAt: new Date(dateStr + 'T08:30:00Z').toISOString(),
        createdBy: adminUser.id,
      };
      
      batch.push(entry);
      totalEntries++;
      
      if (batch.length >= batchSize) {
        await Promise.all(batch.map(e => container.items.create(e)));
        batch = [];
        process.stdout.write(`\r  Processing: ${totalEntries} staff entries...`);
      }
    }
  }
  
  if (batch.length > 0) {
    await Promise.all(batch.map(e => container.items.create(e)));
  }
  
  console.log('');
  log(`  Created ${totalEntries} staff register entries`, '  ✓');
}

async function createRegistrations(container) {
  log('Creating client registrations...', '📝');
  
  const registrations = [
    {
      firstName: 'Patricia',
      surname: 'Green',
      dateOfBirth: '1956-04-22',
      email: 'patricia.green@email.co.uk',
      contactNumber: '07700 900200',
      addressLine1: '34 Meadow Close',
      addressLine3: 'Cheadle Hulme',
      postcode: 'SK8 6AA',
      emergencyContact: { name: 'Andrew Green', relationship: 'Son', phoneNumber: '07700 900201' },
      reviewed: true,
      reviewedAt: '2025-09-15T10:30:00Z',
      submittedAt: '2025-09-10T14:22:00Z',
    },
    {
      firstName: 'George',
      surname: 'White',
      dateOfBirth: '1949-08-11',
      email: 'g.white@email.co.uk',
      contactNumber: '07700 900202',
      addressLine1: '12 The Green',
      addressLine3: 'Altrincham',
      postcode: 'WA14 2BB',
      emergencyContact: { name: 'Helen White', relationship: 'Wife', phoneNumber: '07700 900203' },
      reviewed: true,
      reviewedAt: '2025-10-20T11:15:00Z',
      submittedAt: '2025-10-18T09:45:00Z',
    },
    {
      firstName: 'Maureen',
      surname: 'Davies',
      dateOfBirth: '1951-01-30',
      email: 'maureen.d@email.co.uk',
      contactNumber: '07700 900204',
      addressLine1: '56 Park Road',
      addressLine3: 'Wilmslow',
      postcode: 'SK9 5CC',
      emergencyContact: { name: 'Stephen Davies', relationship: 'Husband', phoneNumber: '07700 900205' },
      reviewed: true,
      reviewedAt: '2025-11-05T14:00:00Z',
      submittedAt: '2025-11-01T16:30:00Z',
      importantInfo: 'Interested in art activities.',
    },
    {
      firstName: 'Kenneth',
      surname: 'Harris',
      dateOfBirth: '1954-06-15',
      email: 'ken.harris@email.co.uk',
      contactNumber: '07700 900206',
      addressLine1: '8 Chapel Lane',
      addressLine3: 'Bramhall',
      postcode: 'SK7 1DD',
      emergencyContact: { name: 'Janet Harris', relationship: 'Daughter', phoneNumber: '07700 900207' },
      reviewed: false, // PENDING - shows review workflow
      submittedAt: '2026-01-15T11:20:00Z',
      importantInfo: 'Recently retired. Looking for social activities.',
    },
    {
      firstName: 'Sylvia',
      surname: 'Turner',
      dateOfBirth: '1948-12-03',
      email: 'sylvia.t@email.co.uk',
      contactNumber: '07700 900208',
      addressLine1: '99 High Lane',
      addressLine3: 'Stockport',
      postcode: 'SK6 8EE',
      emergencyContact: { name: 'Care Plus Agency', relationship: 'Care Agency', phoneNumber: '0161 555 1234' },
      reviewed: false, // PENDING
      submittedAt: '2026-01-20T09:05:00Z',
      importantInfo: 'Referred by social services. Needs assessment.',
      photoConsent: true,
    },
  ];
  
  for (const regData of registrations) {
    const registration = {
      id: uuidv4(),
      firstName: regData.firstName,
      surname: regData.surname,
      dateOfBirth: regData.dateOfBirth,
      email: regData.email,
      contactNumber: regData.contactNumber,
      addressLine1: regData.addressLine1,
      addressLine2: regData.addressLine2 || '',
      addressLine3: regData.addressLine3,
      addressLine4: regData.addressLine4 || '',
      postcode: regData.postcode,
      emergencyContact: regData.emergencyContact,
      importantInfo: regData.importantInfo || '',
      photoConsent: regData.photoConsent || false,
      submittedAt: regData.submittedAt,
      reviewed: regData.reviewed,
      reviewedAt: regData.reviewedAt,
      reviewedBy: regData.reviewed ? 'admin' : undefined,
      notes: '',
    };
    
    await container.items.create(registration);
  }
  
  log(`  Created ${registrations.length} registrations (${registrations.filter(r => !r.reviewed).length} pending)`, '  ✓');
}

// =============================================================================
// Main Script
// =============================================================================

async function waitForEmulator(client, maxAttempts = 30) {
  log('Checking Cosmos DB emulator connection...', '🔌');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.getDatabaseAccount();
      log('Emulator is ready!', '✅');
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error('Could not connect to Cosmos DB emulator. Is it running? (docker compose up -d)');
      }
      process.stdout.write(`\r  Waiting for emulator... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function createDatabaseAndContainers(client) {
  log('Creating database and containers...', '🗄️');
  
  // Create database
  const { database } = await client.databases.createIfNotExists({
    id: DATABASE_NAME,
  });
  log(`  Database: ${DATABASE_NAME}`, '  ✓');
  
  // Create containers
  const containers = {};
  for (const containerConfig of CONTAINERS) {
    const { container } = await database.containers.createIfNotExists({
      id: containerConfig.name,
      partitionKey: { paths: [containerConfig.partitionKey] },
    });
    containers[containerConfig.name] = container;
    log(`  Container: ${containerConfig.name}`, '  ✓');
  }
  
  return { database, containers };
}

async function clearAllData(containers) {
  log('Clearing existing data...', '🗑️');
  
  for (const [name, container] of Object.entries(containers)) {
    try {
      const { resources } = await container.items
        .query('SELECT c.id FROM c')
        .fetchAll();
      
      if (resources.length > 0) {
        // For each item, we need to delete with the partition key
        // Read and delete each item
        for (const item of resources) {
          try {
            const { resource } = await container.item(item.id, item.id).read();
            if (resource) {
              // Get the partition key value based on container
              let partitionKey;
              switch (name) {
                case 'register':
                case 'staff-register':
                  partitionKey = resource.date;
                  break;
                case 'invoices':
                case 'incidents':
                case 'client-notes':
                  partitionKey = resource.clientId;
                  break;
                default:
                  partitionKey = resource.id;
              }
              await container.item(item.id, partitionKey).delete();
            }
          } catch (e) {
            // Item may have been deleted, continue
          }
        }
        log(`  Cleared ${resources.length} items from ${name}`, '  ✓');
      }
    } catch (error) {
      log(`  Could not clear ${name}: ${error.message}`, '  ⚠');
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  🌱 Demo Data Seeding Script');
  console.log('  Full year: January 2025 - January 2026');
  console.log('='.repeat(60) + '\n');
  
  if (RESET_MODE) {
    log('Running in RESET mode - will clear existing data\n', '⚠️');
  }
  
  try {
    const client = new CosmosClient(CONNECTION_STRING);
    
    // Wait for emulator to be ready
    await waitForEmulator(client);
    
    // Create database and containers
    const { containers } = await createDatabaseAndContainers(client);
    
    // Check if data already exists
    const { resources: existingUsers } = await containers.users.items
      .query('SELECT * FROM c WHERE c.email = "demo@example.com"')
      .fetchAll();
    
    if (existingUsers.length > 0 && !RESET_MODE) {
      console.log('\n' + '='.repeat(60));
      log('Demo data already exists!', '✅');
      log('Use --reset flag to clear and re-seed: npm run seed:reset', 'ℹ️');
      console.log('='.repeat(60));
      console.log('\n  Demo login: demo@example.com / Demo123!\n');
      process.exit(0);
    }
    
    // Clear existing data if reset mode
    if (RESET_MODE) {
      await clearAllData(containers);
    }
    
    console.log('');
    
    // Create all data
    const users = await createUsers(containers.users);
    const clients = await createClients(containers.clients);
    await createRegisterEntries(containers.register, clients, users);
    await createInvoices(containers.invoices, clients, containers.register);
    await createSettings(containers.settings);
    await createIncidents(containers.incidents, clients, users);
    await createClientNotes(containers['client-notes'], clients, users);
    const staff = await createStaff(containers.staff, users);
    await createStaffRegister(containers['staff-register'], staff, users);
    await createRegistrations(containers.registrations);
    
    console.log('\n' + '='.repeat(60));
    log('Demo data seeding complete!', '🎉');
    console.log('='.repeat(60));
    console.log('\n  Demo login:');
    console.log('    Email:    demo@example.com');
    console.log('    Password: Demo123!');
    console.log('\n  Worker logins:');
    console.log('    sarah.wilson@example.com / Worker123!');
    console.log('    james.taylor@example.com / Worker123!');
    console.log('\n  Start the app with: npm run dev:swa\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 The Cosmos DB emulator may not be running.');
      console.log('   Start it with: docker compose up -d');
      console.log('   Wait 60-90 seconds for it to initialise.');
    }
    process.exit(1);
  }
}

main();
