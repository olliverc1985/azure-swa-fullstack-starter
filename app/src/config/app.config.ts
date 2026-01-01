/**
 * Application Configuration
 * 
 * This file centralises all configurable application settings.
 * Values are loaded from environment variables with sensible defaults.
 * 
 * To customise for your deployment:
 * 1. Copy .env.example to .env
 * 2. Update values as needed
 * 3. For production, set environment variables in your hosting platform
 */

interface AppConfig {
  // Application identity
  name: string
  description: string
  tagline: string
  
  // Branding
  logo: {
    path: string
    alt: string
  }
  
  // Owner/Company information (displayed in footer)
  owner: {
    name: string
    company: string
    showInFooter: boolean
  }
  
  // Storage keys (for localStorage)
  storage: {
    tokenKey: string
    userKey: string
  }
  
  // API configuration
  api: {
    baseUrl: string
  }
}

/**
 * Get environment variable with fallback
 * In Vite, env vars must be prefixed with VITE_
 */
function getEnv(key: string, defaultValue: string): string {
  // Vite exposes env vars on import.meta.env
  const value = import.meta.env[key]
  return value ?? defaultValue
}

export const appConfig: AppConfig = {
  // Application identity
  name: getEnv('VITE_APP_NAME', 'My App'),
  description: getEnv('VITE_APP_DESCRIPTION', 'A modern web application'),
  tagline: getEnv('VITE_APP_TAGLINE', 'Welcome to your application'),
  
  // Branding
  logo: {
    path: getEnv('VITE_LOGO_PATH', '/logo.svg'),
    alt: getEnv('VITE_APP_NAME', 'My App'),
  },
  
  // Owner/Company information
  owner: {
    name: getEnv('VITE_OWNER_NAME', ''),
    company: getEnv('VITE_OWNER_COMPANY', ''),
    showInFooter: getEnv('VITE_SHOW_OWNER_FOOTER', 'false') === 'true',
  },
  
  // Storage keys (prefixed to avoid collisions)
  storage: {
    tokenKey: `${getEnv('VITE_STORAGE_PREFIX', 'app')}_auth_token`,
    userKey: `${getEnv('VITE_STORAGE_PREFIX', 'app')}_user`,
  },
  
  // API configuration
  api: {
    baseUrl: getEnv('VITE_API_BASE_URL', '/api'),
  },
}

export default appConfig
