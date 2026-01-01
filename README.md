# Azure SWA Fullstack Starter

> Production-ready Azure Static Web Apps template with React, Azure Functions, Cosmos DB, and full CI/CD.

A comprehensive starter template for building modern fullstack applications on Azure. Includes authentication, database integration, invoice generation, client management, and more—all configured and ready to deploy.

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
- 🔄 **GitHub Actions** for CI/CD

### Application Features
- 👥 Client management with notes and history
- 📋 Daily register/attendance tracking
- 💰 Invoice generation with PDF export
- 👨‍💼 Staff management and time tracking
- 📈 Dashboard with analytics and trends
- 🔒 Role-based access control (Admin/Worker)

## 🚀 Quick Start

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

### Azure Setup

1. **Create Resource Group**
   ```bash
   az group create --name rg-myapp-dev --location westeurope
   ```

2. **Deploy Infrastructure**
   ```bash
   az deployment group create \
     --resource-group rg-myapp-dev \
     --template-file ./infrastructure/bicep/main.bicep \
     --parameters environment=dev
   ```

3. **Configure GitHub Secrets**
   - `AZURE_CREDENTIALS` - Service principal JSON
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` - From Azure Portal
   - `JWT_SECRET` - Secret for JWT signing

4. **Deploy**
   Push to `main` branch to trigger deployment.

### Manual Deployment

```bash
cd app
npm run build
npm run build:api
swa deploy --env production
```

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

---Built with ❤️ using Azure Static Web Apps