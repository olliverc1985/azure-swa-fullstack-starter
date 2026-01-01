/**
 * API Configuration
 * 
 * This file centralises all configurable API settings.
 * Values are loaded from environment variables.
 * 
 * For local development, set these in api/local.settings.json
 * For production, set these in Azure App Settings
 */

interface ApiConfig {
  // Database configuration
  database: {
    connectionString: string
    databaseName: string
  }
  
  // Authentication
  auth: {
    jwtSecret: string
    tokenExpiryHours: number
  }
}

/**
 * Get required environment variable or throw
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is not defined`)
  }
  return value
}

/**
 * Get optional environment variable with default
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

/**
 * Get API configuration
 * Note: This is a function rather than a constant to ensure env vars are
 * read at runtime (important for Azure Functions cold starts)
 */
export function getApiConfig(): ApiConfig {
  return {
    database: {
      connectionString: getRequiredEnv('COSMOS_DB_CONNECTION_STRING'),
      databaseName: getEnv('COSMOS_DB_DATABASE_NAME', 'appdb'),
    },
    auth: {
      jwtSecret: getRequiredEnv('JWT_SECRET'),
      tokenExpiryHours: parseInt(getEnv('JWT_EXPIRY_HOURS', '24'), 10),
    },
  }
}

// Export database name constant for easy access
export function getDatabaseName(): string {
  return getEnv('COSMOS_DB_DATABASE_NAME', 'appdb')
}
