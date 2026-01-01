import { HttpRequest, InvocationContext } from '@azure/functions'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getContainer, CONTAINERS } from './database'

// Read JWT_SECRET at runtime - REQUIRED in production
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Set this in Azure Static Web Apps configuration.')
  }
  return secret
}
const JWT_EXPIRES_IN = '24h' // Reduced from 7d for security

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'worker'
  tokenVersion?: number // For session invalidation
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'worker'
  passwordHash: string
  tokenVersion: number // For session invalidation on password change
  createdAt: string
  updatedAt: string
}

// ============================================
// Rate Limiting (in-memory)
// ============================================
interface RateLimitRecord {
  count: number
  resetAt: number
}

const loginAttempts = new Map<string, RateLimitRecord>()
const RATE_LIMIT_MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; resetInSeconds: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  
  // Clean up old entries periodically
  if (loginAttempts.size > 1000) {
    for (const [key, val] of loginAttempts.entries()) {
      if (now > val.resetAt) loginAttempts.delete(key)
    }
  }
  
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1, resetInSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) }
  }
  
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const resetInSeconds = Math.ceil((record.resetAt - now) / 1000)
    return { allowed: false, remainingAttempts: 0, resetInSeconds }
  }
  
  record.count++
  return { 
    allowed: true, 
    remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000)
  }
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip)
}

export function getClientIp(request: HttpRequest): string {
  // Azure provides client IP in these headers
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-client-ip') 
    || 'unknown'
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getTokenFromRequest(request: HttpRequest): string | null {
  // Use custom header to bypass Azure SWA's built-in auth interception
  const authHeader = request.headers.get('x-app-auth')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

export async function authenticateRequest(request: HttpRequest, context: InvocationContext): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(request)
  if (!token) {
    context.warn('No authorization token provided')
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    context.warn('Invalid or expired token')
    return null
  }

  // Validate token version against database to ensure session hasn't been invalidated
  try {
    const container = getContainer(CONTAINERS.USERS)
    const { resource: user } = await container.item(payload.userId, payload.userId).read<User>()
    
    if (!user) {
      context.warn('User not found for token')
      return null
    }
    
    // Check if token version matches (invalidates tokens after password change)
    // Use same fallback as login (tokenVersion || 1) for consistency
    const userTokenVersion = user.tokenVersion || 1
    if (payload.tokenVersion !== undefined && userTokenVersion !== payload.tokenVersion) {
      context.warn('Token version mismatch - session invalidated')
      return null
    }
  } catch (error) {
    context.error('Error validating token version:', error)
    // Allow auth to proceed if DB check fails (graceful degradation)
    // This prevents total lockout if there's a transient DB issue
  }

  return payload
}

export function requireAdmin(payload: TokenPayload | null): boolean {
  return payload?.role === 'admin'
}

// Sanitise user for client response (remove sensitive fields)
export function sanitiseUser(user: User): Omit<User, 'passwordHash' | 'tokenVersion'> {
  const { passwordHash, tokenVersion, ...sanitised } = user
  return sanitised
}


