# Azure SWA Fullstack Starter

> A comprehensive Azure Static Web Apps template with React, Azure Functions, Cosmos DB, and full CI/CD.

A feature-complete starter template for building modern fullstack applications on Azure. Includes authentication, database integration, invoice generation, client management, and more—all configured and ready to deploy.

> 📋 **Note**: This template is configured for ease of development and learning. See the [Security Considerations](#-security-considerations) section for production hardening recommendations.

## ✨ Features

### Frontend
- ⚛️ **React 18** with TypeScript
- ⚡ **Vite** for lightning-fast development
- 🎨 **Tailwind CSS** with custom theming
- 📊 **Recharts** for data visualisation
- 🔄 **TanStack Query** for data fetching
- 🧭 **React Router** for navigation
- 📱 **Responsive design** - works on all devices

### Backend
- ⚡ **Azure Functions** (Node.js 20)
- 🗄️ **Azure Cosmos DB** (Serverless)
- 🔐 **JWT authentication** with bcrypt
- ✅ **Input validation** with comprehensive error handling
- 🏥 **Health endpoints** for monitoring

### Infrastructure
- 🚀 **Azure Static Web Apps** hosting
- 🔑 **Azure Key Vault** for secrets
- 📊 **Application Insights** for monitoring
- 🏗️ **Bicep** for Infrastructure as Code
- 🔄 **GitHub Actions** for CI (tests run automatically)

### Application Features
- 👥 Client management with notes and history
- 📋 Daily register/attendance tracking
- 💰 Invoice generation with PDF export
- 👨‍💼 Staff management and time tracking
- 📈 Dashboard with analytics and trends
- 🔒 Role-based access control (Admin/Worker)

## 🎮 Try It Now (No Azure Required)

Want to see the app in action? Use **GitHub Codespaces** for a one-click demo environment with pre-populated data.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/olliverc1985/azure-swa-fullstack-starter?quickstart=1)

### What You Get

When you open in Codespaces, the environment automatically:
- ✅ Starts a Cosmos DB emulator
- ✅ Installs all dependencies
- ✅ Seeds a full year of demo data
- ✅ Configures everything for you

Just wait for setup to complete (~2-3 minutes), then:

```bash
cd app && npm run dev:swa
```

Click the forwarded port 5173 link to open the app.

### Demo Logins

| Account | Email | Password |
|---------|-------|----------|
| Admin | demo@example.com | Demo123! |
| Worker | sarah.wilson@example.com | Worker123! |

### Demo Data Included

The seed script creates a full year of realistic data (2025 + January 2026):
- 3 users (1 admin, 2 workers)
- 13 clients with varied profiles
- ~2,000+ register entries
- ~80+ invoices (paid, sent, overdue, draft)
- Incidents, client notes, staff records
- Edge cases: late cancellations, overdue invoices, pending registrations

### Useful Commands

```bash
npm run seed:demo    # Seed demo data (skips if exists)
npm run seed:reset   # Clear all data and re-seed
```

> **Note**: Codespaces offers 60 free hours/month. The Cosmos DB emulator runs in the cloud container, so it works on any machine including Apple Silicon Macs.

---

## 🚀 Quick Start (With Azure)

### Prerequisites
- Node.js 20+
- Azure CLI
- Azure Functions Core Tools v4
- Azure subscription

### 1. Clone & Install

```bash
git clone https://github.com/your-username/azure-swa-fullstack-starter.git
cd azure-swa-fullstack-starter/app

# Install frontend dependencies
npm install

# Install API dependencies
cd api && npm install && cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp ../.env.example .env

# Edit .env with your settings
```

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "your-cosmos-connection-string",
    "COSMOS_DB_DATABASE_NAME": "appdb",
    "JWT_SECRET": "your-development-secret-min-32-chars"
  }
}
```

### 3. Run Locally

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - API
npm run dev:api

# Or run both with SWA CLI
npm run dev:swa
```

Open http://localhost:5173

### 4. Create Admin User

```bash
COSMOS_DB_CONNECTION_STRING="your-connection-string" \
  node ../scripts/create-admin-user.js admin@example.com YourSecurePass123!
```

## 🎨 Customisation

### Branding

Update `.env` with your app details:

```env
VITE_APP_NAME="My App"
VITE_APP_DESCRIPTION="My awesome application"
VITE_APP_TAGLINE="Welcome to My App"
VITE_LOGO_PATH="/logo.svg"
VITE_OWNER_NAME="Your Name"
VITE_OWNER_COMPANY="Your Company"
VITE_SHOW_OWNER_FOOTER="true"
```

### Theme Colours

Edit `app/tailwind.config.js` to customise the `primary` colour palette:

```js
primary: {
  50: '#your-lightest',
  500: '#your-primary',  // Main brand colour
  900: '#your-darkest',
}
```

### Infrastructure Naming

Edit `infrastructure/bicep/main.bicep`:

```bicep
var appPrefix = 'yourapp'  // Change this to your app name
```

> 🔒 **Production**: Before deploying to production, review the [Security Considerations](#-security-considerations) section for recommended hardening steps.

## 📁 Project Structure

```
azure-swa-fullstack-starter/
├── app/                    # Main application
│   ├── src/                # React frontend
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── config/         # App configuration
│   │   └── types/          # TypeScript types
│   ├── api/                # Azure Functions API
│   │   └── src/
│   │       ├── functions/  # Function handlers
│   │       └── shared/     # Shared utilities
│   └── public/             # Static assets
├── infrastructure/         # Infrastructure as Code
│   └── bicep/              # Bicep templates
├── scripts/                # Utility scripts
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD pipelines
```

## 🔐 User Roles

| Feature | Admin | Worker |
|---------|-------|--------|
| View dashboard | ✅ | ❌ |
| Take register | ✅ | ✅ |
| View/edit clients | ✅ | ✅ |
| Add new clients | ✅ | ✅ |
| View payments | ✅ | ❌ |
| Generate invoices | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| Manage settings | ✅ | ❌ |

## 🚀 Deployment

### CI Pipeline (Automatic)

This repo includes a working CI pipeline (`.github/workflows/ci.yml`) that runs automatically:
- ✅ Linting
- ✅ Frontend tests  
- ✅ API tests
- ✅ Type checking

### Azure Deployment (Optional)

To deploy to Azure, you'll need to set up the deployment workflow:

1. **Rename the template workflow**
   ```bash
   mv .github/workflows/deploy.yml.example .github/workflows/deploy.yml
   ```

2. **Create Resource Group**
   ```bash
   az group create --name rg-myapp-dev --location westeurope
   ```

3. **Deploy Infrastructure**
   ```bash
   az deployment group create \
     --resource-group rg-myapp-dev \
     --template-file ./infrastructure/bicep/main.bicep \
     --parameters environment=dev
   ```

4. **Configure GitHub Secrets**
   - `AZURE_CREDENTIALS` - Service principal JSON ([how to create](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure))
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - From Azure Portal > Static Web App > Manage deployment token
   - `JWT_SECRET` - Secret for JWT signing (min 32 characters)

5. **Update resource names** in `deploy.yml` (search for `yourapp`)

6. **Deploy** - Push to `main` branch to trigger deployment

### Manual Deployment

```bash
cd app
npm run build
npm run build:api
swa deploy --env production
```

## 🔒 Security Considerations

> ⚠️ **Important**: This template prioritises ease of setup for development and learning. For production deployments, review the security measures below.

### Current Setup (Development-Friendly)

| Component | Current Configuration | Why |
|-----------|----------------------|-----|
| Cosmos DB | Public network access enabled | Simplifies local development and initial setup |
| Cosmos DB Auth | Connection string-based | Works out of the box without identity configuration |
| Key Vault | Access policies (not RBAC) | Simpler initial configuration |

### Azure Static Web Apps Managed Functions Limitations

Azure Static Web Apps **managed Functions** (the `/api` folder) have inherent platform limitations that affect security architecture:

| Feature | Managed Functions | Bring Your Own Functions |
|---------|:-----------------:|:------------------------:|
| Managed Identity | ❌ | ✅ |
| VNet Integration (outbound) | ❌ | ✅ |
| Private Endpoints to backends | ❌ | ✅ |
| Key Vault References | ❌ | ✅ |

> **Note**: The SWA "Private Endpoint" feature is for **inbound traffic only** (restricting access to your static web app). It does not provide outbound connectivity from managed Functions to private backend services.

This means **managed Functions cannot connect to Cosmos DB via Private Endpoints**. This is a known Azure platform limitation.

### Production Options

#### Option 1: Keep Managed Functions with Enhanced Security (Simpler)

If you stay with managed Functions, apply these security measures:

```bicep
// In infrastructure/bicep/main.bicep - Add IP restrictions to Cosmos DB
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosDbName
  location: location
  properties: {
    // ... existing properties ...
    
    // Allow only Azure services and specific IPs
    publicNetworkAccess: 'Enabled'
    ipRules: [
      { ipAddressOrRange: 'your-office-ip' }  // Add known IPs
    ]
    networkAclBypass: 'AzureServices'  // Allow Azure services including SWA
    
    minimalTlsVersion: 'Tls12'
  }
}
```

Additional hardening:
- Enable **Microsoft Defender for Cosmos DB**
- Configure **diagnostic logging** to Log Analytics
- Use strong, rotated connection strings stored in SWA app settings
- Enable **RBAC on Key Vault** (`enableRbacAuthorization: true`)

#### Option 2: Bring Your Own Functions (Full Security)

For production workloads requiring Private Endpoints and managed identity, migrate to [Bring Your Own Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own):

1. **Create a separate Azure Functions app** with:
   - VNet integration for outbound traffic
   - Managed identity enabled
   - Private Endpoint connectivity to Cosmos DB

2. **Link to your Static Web App**:
   ```bash
   az staticwebapp functions link \
     --name <swa-name> \
     --resource-group <resource-group> \
     --function-resource-id <functions-app-resource-id>
   ```

3. **Configure Cosmos DB with Private Endpoint**:
   ```bicep
   resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
     properties: {
       publicNetworkAccess: 'Disabled'
       disableLocalAuth: true  // Enforce RBAC only
     }
   }
   ```

4. **Use managed identity in your Functions code**:
   ```typescript
   import { DefaultAzureCredential } from '@azure/identity';
   import { CosmosClient } from '@azure/cosmos';

   const credential = new DefaultAzureCredential();
   const client = new CosmosClient({
     endpoint: process.env.COSMOS_DB_ENDPOINT,
     aadCredentials: credential
   });
   ```

### Security Comparison

| Approach | Complexity | Network Isolation | Managed Identity | Cost |
|----------|:----------:|:-----------------:|:----------------:|:----:|
| Managed Functions + IP rules | Low | Partial | ❌ | Lower |
| Bring Your Own Functions | High | Full | ✅ | Higher |

### Security Resources

- [SWA Managed vs Bring Your Own Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions)
- [Azure Cosmos DB Security Best Practices](https://learn.microsoft.com/en-us/azure/cosmos-db/security)
- [Bring Your Own Functions Setup](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)

## 🧪 Testing

```bash
# Run all tests
cd app && npm test

# Run API tests
cd api && npm test

# Run with coverage
npm test -- --coverage
```

**Current Status**: ✅ 198 tests passing

## 📖 Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Database Setup](./docs/DATABASE_SETUP.md)
- [Dashboard Implementation](./docs/DASHBOARD_IMPLEMENTATION_PLAN.md)

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Azure Functions, Node.js 20 |
| Database | Azure Cosmos DB (Serverless) |
| Auth | JWT, bcrypt |
| Hosting | Azure Static Web Apps |
| IaC | Bicep |
| CI/CD | GitHub Actions |
| Testing | Vitest, Testing Library |

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with DB status |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | User registration (admin only) |
| `/api/clients` | GET/POST | Client management |
| `/api/invoices` | GET/POST | Invoice management |
| `/api/register` | GET/POST | Daily attendance |
| `/api/dashboard` | GET | Dashboard analytics |

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 Licence

MIT © Colin Olliver

---

Built using Azure Static Web Apps