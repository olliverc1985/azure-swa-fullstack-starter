# Database Setup Guide

This guide explains how to set up the Azure Cosmos DB database for the application from scratch.

## Overview

The application uses **Azure Cosmos DB** with the SQL API in serverless mode. The database is automatically created via the Bicep infrastructure templates during deployment, but this guide covers manual setup and data migration scenarios.

## Database Structure

### Database Name
- **Production/Dev**: `appdb` (configurable via `COSMOS_DB_DATABASE_NAME` environment variable)

### Containers

| Container | Partition Key | Purpose |
|-----------|---------------|---------|
| `users` | `/id` | User accounts and authentication |
| `clients` | `/id` | Client/customer records |
| `register` | `/date` | Daily attendance records |
| `invoices` | `/clientId` | Generated invoices |
| `settings` | `/id` | Application configuration |
| `incidents` | `/clientId` | Incident reports |
| `client-notes` | `/clientId` | Client notes and requirements |
| `staff` | `/id` | Staff member profiles |
| `staff-register` | `/date` | Staff attendance records |
| `registrations` | `/id` | Public registration submissions |

## Automated Setup (Recommended)

### Via GitHub Actions

The database is automatically provisioned when you deploy to Azure:

1. Push to `main` branch (dev environment) or `prod` branch (production)
2. The Bicep template in `infrastructure/bicep/main.bicep` creates:
   - Cosmos DB account (serverless)
   - Database with all containers
   - Proper indexing policies

### Via Azure CLI

```bash
# Deploy infrastructure manually
az deployment group create \
  --resource-group rg-your-app-dev-weu-001 \
  --template-file ./infrastructure/bicep/main.bicep \
  --parameters environment=dev nameSuffix=001
```

## Manual Setup

### 1. Create Cosmos DB Account

```bash
# Create resource group
az group create --name rg-your-app-dev --location westeurope

# Create Cosmos DB account (serverless)
az cosmosdb create \
  --name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --kind GlobalDocumentDB \
  --capabilities EnableServerless \
  --default-consistency-level Session
```

### 2. Create Database

```bash
az cosmosdb sql database create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --name appdb
```

### 3. Create Containers

```bash
# Users container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name users \
  --partition-key-path /id

# Clients container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name clients \
  --partition-key-path /id

# Register container (partitioned by date for efficient queries)
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name register \
  --partition-key-path /date

# Invoices container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name invoices \
  --partition-key-path /clientId

# Settings container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name settings \
  --partition-key-path /id

# Incidents container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name incidents \
  --partition-key-path /clientId

# Client notes container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name client-notes \
  --partition-key-path /clientId

# Staff container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name staff \
  --partition-key-path /id

# Staff register container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name staff-register \
  --partition-key-path /date

# Registrations container
az cosmosdb sql container create \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --name registrations \
  --partition-key-path /id
```

## Creating the First Admin User

After database setup, you need to create an initial admin user. Use this script:

### Option 1: Node.js Script

Create a file `scripts/create-admin.js`:

```javascript
const { CosmosClient } = require('@azure/cosmos');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('COSMOS_DB_CONNECTION_STRING environment variable required');
    process.exit(1);
  }

  const client = new CosmosClient(connectionString);
  const database = client.database('appdb');
  const container = database.container('users');

  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'ChangeMe123!';

  // Check if user exists
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: email.toLowerCase() }]
    })
    .fetchAll();

  if (resources.length > 0) {
    console.log('User already exists:', email);
    return;
  }

  const now = new Date().toISOString();
  const user = {
    id: uuidv4(),
    email: email.toLowerCase(),
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    passwordHash: await bcrypt.hash(password, 12),
    tokenVersion: 1,
    createdAt: now,
    updatedAt: now,
  };

  await container.items.create(user);
  console.log('Admin user created:', email);
  console.log('Password:', password);
  console.log('\n⚠️  Change this password immediately after first login!');
}

createAdmin().catch(console.error);
```

Run with:
```bash
COSMOS_DB_CONNECTION_STRING="your-connection-string" \
  node scripts/create-admin.js admin@example.com YourSecurePassword123!
```

### Option 2: Azure Data Explorer

1. Go to Azure Portal → Your Cosmos DB account → Data Explorer
2. Select `appdb` → `users` → Items
3. Click "New Item" and paste:

```json
{
  "id": "generate-a-uuid-here",
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "passwordHash": "$2a$12$...", 
  "tokenVersion": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Note**: You'll need to generate the bcrypt hash separately using:
```javascript
const bcrypt = require('bcryptjs');
console.log(await bcrypt.hash('YourPassword123!', 12));
```

## Initial Settings

Create the application settings document in the `settings` container:

```json
{
  "id": "app-settings",
  "business": {
    "name": "Your Business Name",
    "addressLine1": "123 Main Street",
    "addressLine2": "",
    "city": "London",
    "county": "Greater London",
    "postcode": "SW1A 1AA"
  },
  "bank": {
    "accountName": "Your Business Name",
    "bankName": "Your Bank",
    "sortCode": "00-00-00",
    "accountNumber": "00000000"
  },
  "rates": {
    "standard": 40,
    "reduced": 36
  },
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "updatedBy": "system"
}
```

## Connection String

Get your connection string:

```bash
az cosmosdb keys list \
  --name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

Set it in your environment:
- **Local development**: Add to `api/local.settings.json`
- **Azure Static Web Apps**: Configure in Application Settings
- **GitHub Actions**: Store in Key Vault (handled automatically by deploy workflow)

## Data Migration

### Exporting Data

Use Azure Data Explorer or the Cosmos DB migration tool:

```bash
# Install migration tool
npm install -g cosmos-migrate

# Export container
cosmos-migrate export \
  --connection-string "$COSMOS_CONNECTION_STRING" \
  --database appdb \
  --container clients \
  --output ./backup/clients.json
```

### Importing Data

```bash
cosmos-migrate import \
  --connection-string "$COSMOS_CONNECTION_STRING" \
  --database appdb \
  --container clients \
  --input ./backup/clients.json
```

## Indexing Policies

The Bicep templates set up optimised indexing. Key configurations:

- **All containers**: Automatic indexing on all paths
- **Incidents**: Composite index on `[date DESC, time DESC]`
- **Client notes**: Composite index on `[noteType ASC, updatedAt DESC]`
- **Staff register**: Composite index on `[staffId ASC, date DESC]`

## Backup & Recovery

### Continuous Backup

The Bicep template enables continuous backup with 7-day retention:

```bicep
backupPolicy: {
  type: 'Continuous'
  continuousModeProperties: {
    tier: 'Continuous7Days'
  }
}
```

### Point-in-Time Restore

```bash
az cosmosdb restore \
  --resource-group rg-your-app-dev \
  --account-name cosmos-your-app-dev-restored \
  --source-account cosmos-your-app-dev \
  --restore-timestamp "2024-01-15T10:00:00Z" \
  --location westeurope
```

## Troubleshooting

### "Container not found" errors
Ensure all containers are created. Check with:
```bash
az cosmosdb sql container list \
  --account-name cosmos-your-app-dev \
  --resource-group rg-your-app-dev \
  --database-name appdb \
  --output table
```

### Connection issues
1. Verify connection string is correct
2. Check firewall rules if using IP restrictions
3. Ensure the database endpoint is accessible

### Performance issues
- Check Request Units (RUs) consumption in Azure Portal
- Review indexing policies for frequently queried fields
- Consider adding composite indexes for complex queries

## Local Development with Cosmos DB Emulator

For local development without Azure costs:

1. Install [Azure Cosmos DB Emulator](https://aka.ms/cosmosdb-emulator)
2. Use connection string: `AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==`
3. Create database and containers as described above

---

## Quick Reference

| Task | Command |
|------|---------|
| Get connection string | `az cosmosdb keys list --name $NAME --type connection-strings` |
| List containers | `az cosmosdb sql container list --account-name $NAME --database-name appdb` |
| Query data | Use Azure Data Explorer in portal |
| Create backup | Automatic with continuous backup enabled |
