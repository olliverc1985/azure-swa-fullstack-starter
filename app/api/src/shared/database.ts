import { CosmosClient, Container } from '@azure/cosmos'
import { getDatabaseName } from './config'

let client: CosmosClient | null = null

/**
 * Get Cosmos DB client instance.
 *
 * ⚠️ SECURITY NOTE: Currently uses connection string authentication for ease of development.
 * For production, consider using Azure RBAC with managed identity:
 *
 * ```typescript
 * import { DefaultAzureCredential } from '@azure/identity';
 *
 * const credential = new DefaultAzureCredential();
 * client = new CosmosClient({
 *   endpoint: process.env.COSMOS_DB_ENDPOINT,
 *   aadCredentials: credential
 * });
 * ```
 *
 * This requires:
 * 1. Enabling managed identity on Azure Static Web Apps
 * 2. Assigning 'Cosmos DB Built-in Data Contributor' role to the identity
 * 3. Setting disableLocalAuth: true on Cosmos DB to enforce RBAC
 *
 * See README.md Security Considerations section for details.
 */
export function getCosmosClient(): CosmosClient {
  if (client) {
    return client
  }

  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING
  if (!connectionString) {
    throw new Error('COSMOS_DB_CONNECTION_STRING is not defined')
  }

  client = new CosmosClient(connectionString)
  return client
}

export function getContainer(containerName: string): Container {
  const cosmosClient = getCosmosClient()
  const database = cosmosClient.database(getDatabaseName())
  return database.container(containerName)
}

// Container names
export const CONTAINERS = {
  USERS: 'users',
  CLIENTS: 'clients',
  REGISTER: 'register',
  INVOICES: 'invoices',
  SETTINGS: 'settings',
  INCIDENTS: 'incidents',
  CLIENT_NOTES: 'client-notes',
  STAFF: 'staff',
  STAFF_REGISTER: 'staff-register',
  REGISTRATIONS: 'registrations',
} as const


