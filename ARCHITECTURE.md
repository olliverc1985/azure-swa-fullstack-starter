# Architecture Overview

This document describes the architecture of the Azure SWA Fullstack Starter template.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Static Web Apps                      │
├─────────────────────────────────┬───────────────────────────────┤
│         Frontend (React)        │      API (Azure Functions)     │
│                                 │                                 │
│  ┌─────────────────────────┐   │   ┌─────────────────────────┐  │
│  │      React Router       │   │   │    Function Handlers    │  │
│  │         Pages           │   │   │   /api/auth/login       │  │
│  │       Components        │   │   │   /api/clients          │  │
│  │                         │   │   │   /api/invoices         │  │
│  └──────────┬──────────────┘   │   │   /api/register         │  │
│             │                   │   │   /api/dashboard        │  │
│             ▼                   │   └──────────┬──────────────┘  │
│  ┌─────────────────────────┐   │              │                  │
│  │    TanStack Query       │◄──┼──────────────┘                  │
│  │    (Data Fetching)      │   │                                 │
│  └─────────────────────────┘   │   ┌─────────────────────────┐  │
│                                 │   │    Shared Utilities     │  │
│  ┌─────────────────────────┐   │   │   - auth.ts             │  │
│  │   Local Storage         │   │   │   - database.ts         │  │
│  │   (JWT Token)           │   │   │   - validation.ts       │  │
│  └─────────────────────────┘   │   │   - http.ts             │  │
│                                 │   └──────────┬──────────────┘  │
└─────────────────────────────────┴──────────────┼─────────────────┘
                                                  │
                                                  ▼
                                   ┌─────────────────────────┐
                                   │   Azure Cosmos DB       │
                                   │   (Serverless)          │
                                   │                         │
                                   │   - users               │
                                   │   - clients             │
                                   │   - invoices            │
                                   │   - register            │
                                   │   - settings            │
                                   │   - ...                 │
                                   └─────────────────────────┘
```

## Directory Structure

```
azure-swa-fullstack-starter/
├── app/                          # Main application
│   ├── src/                      # Frontend source
│   │   ├── components/           # React components
│   │   │   ├── ui/               # Shared UI components
│   │   │   ├── layout/           # Layout components
│   │   │   ├── dashboard/        # Dashboard widgets
│   │   │   ├── clients/          # Client-related components
│   │   │   └── incidents/        # Incident components
│   │   ├── pages/                # Route pages
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # API service layer
│   │   ├── config/               # App configuration
│   │   ├── lib/                  # Utility functions
│   │   └── types/                # TypeScript definitions
│   ├── api/                      # Azure Functions API
│   │   └── src/
│   │       ├── functions/        # HTTP function handlers
│   │       └── shared/           # Shared backend utilities
│   └── public/                   # Static assets
├── infrastructure/               # Infrastructure as Code
│   └── bicep/                    # Azure Bicep templates
├── scripts/                      # Utility scripts
├── docs/                         # Additional documentation
└── .github/                      # GitHub configuration
    └── workflows/                # CI/CD pipelines
```

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider (Context)
│   ├── QueryClientProvider (TanStack Query)
│   │   ├── BrowserRouter
│   │   │   ├── Layout
│   │   │   │   ├── Sidebar
│   │   │   │   ├── Header
│   │   │   │   └── Main Content
│   │   │   │       ├── DashboardPage
│   │   │   │       ├── ClientsPage
│   │   │   │       ├── RegisterPage
│   │   │   │       ├── InvoicesPage
│   │   │   │       └── ...
│   │   │   └── LoginPage (unauthenticated)
```

### State Management

| State Type | Solution | Location |
|------------|----------|----------|
| Server State | TanStack Query | Per-component queries |
| Auth State | React Context | `useAuth` hook |
| Form State | React `useState` | Component-local |
| UI State | React `useState` | Component-local |
| Persisted Auth | localStorage | `authStorage.ts` |

### Data Flow

1. **User Action** → Component handles event
2. **API Call** → TanStack Query mutation/query
3. **HTTP Request** → `services/api.ts` with auth headers
4. **Response** → Query cache update
5. **Re-render** → UI updates automatically

### Shared UI Components

Located in `src/components/ui/`:

| Component | Purpose |
|-----------|---------|
| `Button` | Primary action buttons |
| `Input` | Text input fields |
| `Select` | Dropdown selections |
| `Textarea` | Multi-line text input |
| `Checkbox` | Boolean toggles |
| `Card` | Content containers |
| `Alert` | User notifications |
| `Badge` | Status indicators |
| `Loading` | Loading states |

## Backend Architecture

### Function Structure

Each Azure Function follows this pattern:

```typescript
import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { requireAuth, getAuthenticatedUser } from '../shared/auth'
import { jsonResponse, errorResponse } from '../shared/http'
import { validate } from '../shared/validation'

app.http('function-name', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',  // Auth handled by JWT
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    // 1. Authentication
    const authError = requireAuth(request)
    if (authError) return authError
    
    const user = await getAuthenticatedUser(request)
    
    // 2. Input Validation
    const body = await request.json()
    const validationError = validate(body, schema)
    if (validationError) return errorResponse(400, validationError)
    
    // 3. Business Logic
    const result = await processRequest(body, user)
    
    // 4. Response
    return jsonResponse(result)
  }
})
```

### Shared Utilities

| Module | Purpose |
|--------|---------|
| `auth.ts` | JWT handling, password hashing, user authentication |
| `database.ts` | Cosmos DB client and container access |
| `validation.ts` | Input validation helpers |
| `http.ts` | HTTP response helpers |
| `config.ts` | Environment configuration |

### Authentication Flow

```
┌──────────┐    POST /api/auth/login     ┌──────────┐
│  Client  │ ─────────────────────────► │   API    │
│          │   { email, password }       │          │
└──────────┘                             └────┬─────┘
     ▲                                        │
     │                                        ▼
     │                              ┌─────────────────┐
     │                              │ Validate creds  │
     │                              │ against Cosmos  │
     │                              └────────┬────────┘
     │                                       │
     │      { token, user }                  ▼
     └────────────────────────────  ┌─────────────────┐
                                    │  Generate JWT   │
                                    │  Return token   │
                                    └─────────────────┘

Subsequent requests:
┌──────────┐    X-App-Auth: Bearer <token>   ┌──────────┐
│  Client  │ ─────────────────────────────► │   API    │
└──────────┘                                 └────┬─────┘
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │  Verify JWT     │
                                        │  Extract user   │
                                        │  Process req    │
                                        └─────────────────┘
```

## Database Schema

### Cosmos DB Structure

**Database**: `appdb` (configurable)

| Container | Partition Key | Description |
|-----------|---------------|-------------|
| `users` | `/id` | User accounts |
| `clients` | `/id` | Client records |
| `register` | `/date` | Daily attendance |
| `invoices` | `/clientId` | Generated invoices |
| `settings` | `/id` | App configuration |
| `incidents` | `/clientId` | Incident reports |
| `client-notes` | `/clientId` | Client notes |
| `staff` | `/id` | Staff profiles |
| `staff-register` | `/date` | Staff attendance |
| `registrations` | `/id` | Public registrations |

### Key Documents

**User Document**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "admin|worker",
  "passwordHash": "bcrypt-hash",
  "tokenVersion": 1,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

**Client Document**
```json
{
  "id": "uuid",
  "firstName": "Jane",
  "surname": "Smith",
  "email": "jane@example.com",
  "contactNumber": "+44...",
  "days": ["Monday", "Wednesday"],
  "rate": 40,
  "status": "active",
  "address": { ... },
  "emergencyContact": { ... },
  "createdAt": "ISO-8601"
}
```

## Infrastructure

### Azure Resources

```
Resource Group
├── Static Web App (Standard tier)
│   └── Hosts frontend + API
├── Cosmos DB Account (Serverless)
│   └── Database: appdb
│       └── Containers: users, clients, etc.
├── Key Vault
│   └── Secrets: JWT_SECRET, connection strings
├── Application Insights
│   └── Telemetry & logging
└── Log Analytics Workspace
    └── Query & analysis
```

### Bicep Template

The `infrastructure/bicep/main.bicep` defines:

1. **Static Web App** - Standard tier for production features
2. **Cosmos DB** - Serverless mode for cost efficiency
3. **Key Vault** - Secrets management with access policies
4. **Application Insights** - Monitoring and diagnostics
5. **Log Analytics** - Centralised logging

### Environment Configuration

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_*` | `.env` | Frontend configuration |
| `COSMOS_DB_CONNECTION_STRING` | Key Vault / App Settings | Database connection |
| `JWT_SECRET` | Key Vault / App Settings | Token signing |
| `COSMOS_DB_DATABASE_NAME` | App Settings | Database name |

## Security

### Authentication

- **JWT Tokens** - Short-lived (24h default)
- **bcrypt** - Password hashing (cost factor 12)
- **Token versioning** - Invalidate all tokens on password change

### API Security

- **Input validation** - All endpoints validate input
- **CORS** - Configured via Static Web Apps
- **HTTPS** - Enforced by Azure
- **Custom auth header** - `X-App-Auth` to bypass SWA interception

### Data Security

- **Cosmos DB encryption** - At rest and in transit
- **Key Vault** - Secrets never in code
- **Principle of least privilege** - Scoped access policies

## Performance

### Frontend

- **Code splitting** - Per-route lazy loading
- **Query caching** - TanStack Query cache
- **Optimistic updates** - Instant UI feedback
- **Asset optimisation** - Vite production build

### Backend

- **Serverless** - Auto-scaling Functions
- **Connection pooling** - Reused Cosmos client
- **Efficient queries** - Proper partition keys
- **Indexing** - Optimised for query patterns

### Database

- **Partition strategy** - Optimised for access patterns
- **Composite indexes** - For complex queries
- **Serverless mode** - Pay per request

## Monitoring

### Application Insights

- Request tracking
- Dependency tracking
- Exception logging
- Custom metrics

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Full health check with DB status |
| `/api/health/live` | Liveness probe |

## Deployment

### CI/CD Pipeline

```
Push to main
    │
    ▼
┌─────────────────┐
│  Build & Test   │
│  - npm install  │
│  - npm test     │
│  - npm build    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy to SWA   │
│ (Development)   │
└─────────────────┘

Push to prod (via PR merge)
    │
    ▼
┌─────────────────┐
│ Deploy to SWA   │
│ (Production)    │
└─────────────────┘
```

### Environment Promotion

1. **Development** - main branch, auto-deploy
2. **Production** - prod branch, PR approval required

---

*Last updated: December 2025*
