import { CosmosClient, Container } from '@azure/cosmos'
import { getDatabaseName } from './config'

let client: CosmosClient | null = null

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


