// Auth storage keys and helpers
// Separated from useAuth.tsx to allow fast refresh to work properly

import { appConfig } from '@/config/app.config'

export const TOKEN_KEY = appConfig.storage.tokenKey
export const USER_KEY = appConfig.storage.userKey

// Helper to get auth token for API calls
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}



















