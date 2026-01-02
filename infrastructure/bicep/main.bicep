@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('Location for all resources')
param location string = 'westeurope'

@description('Resource name suffix to ensure global uniqueness (e.g., 001, 002)')
param nameSuffix string = '002'

@description('Current user object ID for Key Vault access (optional)')
param currentUserObjectId string = ''

@description('GitHub Actions service principal object ID for CI/CD Key Vault access')
param githubActionsObjectId string = ''  // Set this to your service principal's object ID

// Generate resource names based on environment and suffix
// Customise these prefixes for your deployment
var appPrefix = 'myapp'  // Change this to your app name
var staticWebAppName = 'swa-${appPrefix}-${environment}-weu-${nameSuffix}'
var keyVaultName = 'kv${appPrefix}${environment}weu${nameSuffix}'
var cosmosDbName = 'cosmos-${appPrefix}-${environment}-weu-${nameSuffix}'
var logAnalyticsName = 'log-${appPrefix}-${environment}-weu-${nameSuffix}'
var appInsightsName = 'appi-${appPrefix}-${environment}-weu-${nameSuffix}'

// Log Analytics Workspace for Application Insights
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights for monitoring and debugging
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

// Key Vault for secrets management
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    enableRbacAuthorization: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
    accessPolicies: concat(
      // GitHub Actions service principal
      empty(githubActionsObjectId) ? [] : [
        {
          tenantId: subscription().tenantId
          objectId: githubActionsObjectId
          permissions: {
            secrets: ['get', 'list', 'set']
          }
        }
      ],
      // Optional: Current user for manual deployments
      empty(currentUserObjectId) ? [] : [
        {
          tenantId: subscription().tenantId
          objectId: currentUserObjectId
          permissions: {
            secrets: ['get', 'list', 'set', 'delete']
            certificates: ['get', 'list', 'create', 'update', 'delete']
            keys: ['get', 'list', 'create', 'update', 'delete']
          }
        }
      ]
    )
  }
}

// Cosmos DB for data storage (Serverless)
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosDbName
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous7Days'
      }
    }
    publicNetworkAccess: 'Enabled'
    networkAclBypass: 'AzureServices'
    minimalTlsVersion: 'Tls12'
  }
}

// Create database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDb
  name: 'appdb'
  properties: {
    resource: {
      id: 'appdb'
    }
  }
}

// Users container
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Clients container
resource clientsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'clients'
  properties: {
    resource: {
      id: 'clients'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Register container
resource registerContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'register'
  properties: {
    resource: {
      id: 'register'
      partitionKey: {
        paths: ['/date']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Invoices container
resource invoicesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'invoices'
  properties: {
    resource: {
      id: 'invoices'
      partitionKey: {
        paths: ['/clientId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Settings container (single document store for app configuration)
resource settingsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'settings'
  properties: {
    resource: {
      id: 'settings'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Incidents container for incident reports
resource incidentsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'incidents'
  properties: {
    resource: {
      id: 'incidents'
      partitionKey: {
        paths: ['/clientId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
        compositeIndexes: [
          [
            { path: '/date', order: 'descending' }
            { path: '/time', order: 'descending' }
          ]
        ]
      }
    }
  }
}

// Client notes container for general notes, requirements, etc.
resource clientNotesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'client-notes'
  properties: {
    resource: {
      id: 'client-notes'
      partitionKey: {
        paths: ['/clientId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
        compositeIndexes: [
          [
            { path: '/noteType', order: 'ascending' }
            { path: '/updatedAt', order: 'descending' }
          ]
        ]
      }
    }
  }
}

// Staff container for staff member profiles
resource staffContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'staff'
  properties: {
    resource: {
      id: 'staff'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Staff register container for staff attendance tracking
resource staffRegisterContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'staff-register'
  properties: {
    resource: {
      id: 'staff-register'
      partitionKey: {
        paths: ['/date']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
        compositeIndexes: [
          [
            { path: '/staffId', order: 'ascending' }
            { path: '/date', order: 'descending' }
          ]
        ]
      }
    }
  }
}

// Registrations container for public client registration submissions
resource registrationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'registrations'
  properties: {
    resource: {
      id: 'registrations'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// Outputs for GitHub Actions
output staticWebAppName string = staticWebApp.name
output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output keyVaultName string = keyVault.name
output cosmosDbName string = cosmosDb.name
output cosmosDbEndpoint string = cosmosDb.properties.documentEndpoint
output appInsightsName string = appInsights.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey


