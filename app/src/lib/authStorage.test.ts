import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TOKEN_KEY, USER_KEY, getAuthToken } from './authStorage'
import { appConfig } from '@/config/app.config'

describe('Auth Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constants', () => {
    it('should export TOKEN_KEY from config', () => {
      expect(TOKEN_KEY).toBe(appConfig.storage.tokenKey)
      expect(TOKEN_KEY).toMatch(/_auth_token$/)
    })

    it('should export USER_KEY from config', () => {
      expect(USER_KEY).toBe(appConfig.storage.userKey)
      expect(USER_KEY).toMatch(/_user$/)
    })
  })

  describe('getAuthToken', () => {
    it('should return token from localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('test-token-123')
      
      const token = getAuthToken()
      
      expect(localStorage.getItem).toHaveBeenCalledWith(TOKEN_KEY)
      expect(token).toBe('test-token-123')
    })

    it('should return null when no token exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)
      
      const token = getAuthToken()
      
      expect(token).toBeNull()
    })
  })
})
