import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  getTokenFromRequest,
  requireAdmin,
  sanitiseUser,
  type TokenPayload,
  type User,
} from './auth'

// Mock environment variable for JWT_SECRET
vi.stubEnv('JWT_SECRET', 'test-secret-key-for-testing-purposes-only')

describe('Authentication Utilities', () => {
  describe('generateToken and verifyToken', () => {
    it('should generate a valid JWT token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        tokenVersion: 1,
      }

      const token = generateToken(payload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should verify a valid token and return payload', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'worker',
        tokenVersion: 2,
      }

      const token = generateToken(payload)
      const verified = verifyToken(token)
      
      expect(verified).not.toBeNull()
      expect(verified?.userId).toBe('user-123')
      expect(verified?.email).toBe('test@example.com')
      expect(verified?.role).toBe('worker')
      expect(verified?.tokenVersion).toBe(2)
    })

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid.token.here')
      
      expect(result).toBeNull()
    })

    it('should return null for tampered token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      }

      const token = generateToken(payload)
      const tamperedToken = token.slice(0, -5) + 'xxxxx'
      
      const result = verifyToken(tamperedToken)
      
      expect(result).toBeNull()
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are ~60 chars
    })

    it('should verify correct password', async () => {
      const password = 'SecurePassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword('WrongPassword!', hash)
      
      expect(isValid).toBe(false)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2) // Due to salt
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limit state between tests
      resetRateLimit('test-ip-1')
      resetRateLimit('test-ip-2')
    })

    it('should allow first request', () => {
      const result = checkRateLimit('test-ip-1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4) // 5 max - 1
    })

    it('should track multiple attempts', () => {
      checkRateLimit('test-ip-1')
      checkRateLimit('test-ip-1')
      const result = checkRateLimit('test-ip-1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(2) // 5 - 3
    })

    it('should block after max attempts', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-ip-1')
      }
      
      const result = checkRateLimit('test-ip-1')
      
      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
    })

    it('should reset rate limit for specific IP', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-ip-1')
      }
      
      resetRateLimit('test-ip-1')
      const result = checkRateLimit('test-ip-1')
      
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('should track IPs independently', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-ip-1')
      }
      
      const result1 = checkRateLimit('test-ip-1')
      const result2 = checkRateLimit('test-ip-2')
      
      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
    })
  })

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1'
            return null
          },
        },
      } as unknown as Parameters<typeof getClientIp>[0]
      
      const ip = getClientIp(mockRequest)
      
      expect(ip).toBe('192.168.1.1')
    })

    it('should fallback to x-client-ip header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-client-ip') return '10.0.0.1'
            return null
          },
        },
      } as unknown as Parameters<typeof getClientIp>[0]
      
      const ip = getClientIp(mockRequest)
      
      expect(ip).toBe('10.0.0.1')
    })

    it('should return unknown when no IP headers', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as Parameters<typeof getClientIp>[0]
      
      const ip = getClientIp(mockRequest)
      
      expect(ip).toBe('unknown')
    })
  })

  describe('getTokenFromRequest', () => {
    it('should extract token from X-App-Auth header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-app-auth') return 'Bearer test-token-123'
            return null
          },
        },
      } as unknown as Parameters<typeof getTokenFromRequest>[0]
      
      const token = getTokenFromRequest(mockRequest)
      
      expect(token).toBe('test-token-123')
    })

    it('should return null if no auth header', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as Parameters<typeof getTokenFromRequest>[0]
      
      const token = getTokenFromRequest(mockRequest)
      
      expect(token).toBeNull()
    })

    it('should return null if header does not start with Bearer', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-app-auth') return 'Basic test-token-123'
            return null
          },
        },
      } as unknown as Parameters<typeof getTokenFromRequest>[0]
      
      const token = getTokenFromRequest(mockRequest)
      
      expect(token).toBeNull()
    })
  })

  describe('requireAdmin', () => {
    it('should return true for admin role', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
      }
      
      expect(requireAdmin(payload)).toBe(true)
    })

    it('should return false for worker role', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'worker@example.com',
        role: 'worker',
      }
      
      expect(requireAdmin(payload)).toBe(false)
    })

    it('should return false for null payload', () => {
      expect(requireAdmin(null)).toBe(false)
    })
  })

  describe('sanitiseUser', () => {
    it('should remove sensitive fields from user object', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin',
        passwordHash: '$2a$12$secrethashvalue',
        tokenVersion: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      
      const sanitised = sanitiseUser(user)
      
      expect(sanitised).not.toHaveProperty('passwordHash')
      expect(sanitised).not.toHaveProperty('tokenVersion')
      expect(sanitised).toHaveProperty('id', 'user-123')
      expect(sanitised).toHaveProperty('email', 'test@example.com')
      expect(sanitised).toHaveProperty('firstName', 'John')
      expect(sanitised).toHaveProperty('lastName', 'Doe')
      expect(sanitised).toHaveProperty('role', 'admin')
    })
  })
})
