import { describe, it, expect, vi, beforeEach } from 'vitest'
import { healthCheck, livenessProbe } from './health'
import { HttpRequest, InvocationContext } from '@azure/functions'

// Mock the database module
vi.mock('../shared/database', () => ({
  getCosmosClient: vi.fn(),
}))

import { getCosmosClient } from '../shared/database'

// Create mock request and context
function createMockRequest(): HttpRequest {
  return {
    method: 'GET',
    url: 'http://localhost/api/health',
    headers: new Map(),
    query: new Map(),
    params: {},
  } as unknown as HttpRequest
}

function createMockContext(): InvocationContext {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as InvocationContext
}

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('healthCheck', () => {
    it('should return healthy status when database is connected', async () => {
      // Mock successful database connection
      vi.mocked(getCosmosClient).mockReturnValue({
        getDatabaseAccount: vi.fn().mockResolvedValue({}),
      } as any)

      const request = createMockRequest()
      const context = createMockContext()

      const response = await healthCheck(request, context)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          database: {
            status: 'healthy',
            latencyMs: expect.any(Number),
          },
        },
      })
    })

    it('should return unhealthy status when database connection fails', async () => {
      // Mock failed database connection
      vi.mocked(getCosmosClient).mockReturnValue({
        getDatabaseAccount: vi.fn().mockRejectedValue(new Error('Connection refused')),
      } as any)

      const request = createMockRequest()
      const context = createMockContext()

      const response = await healthCheck(request, context)

      expect(response.status).toBe(503)
      expect(response.jsonBody).toMatchObject({
        status: 'unhealthy',
        checks: {
          database: {
            status: 'unhealthy',
            error: 'Database connection failed',
          },
        },
      })
    })

    it('should include timestamp in response', async () => {
      vi.mocked(getCosmosClient).mockReturnValue({
        getDatabaseAccount: vi.fn().mockResolvedValue({}),
      } as any)

      const request = createMockRequest()
      const context = createMockContext()

      const response = await healthCheck(request, context)

      expect(response.jsonBody).toHaveProperty('timestamp')
      expect(new Date(response.jsonBody.timestamp).toISOString()).toBe(response.jsonBody.timestamp)
    })

    it('should log the health check request', async () => {
      vi.mocked(getCosmosClient).mockReturnValue({
        getDatabaseAccount: vi.fn().mockResolvedValue({}),
      } as any)

      const request = createMockRequest()
      const context = createMockContext()

      await healthCheck(request, context)

      expect(context.info).toHaveBeenCalledWith('GET /api/health')
    })
  })

  describe('livenessProbe', () => {
    it('should return alive status', async () => {
      const request = createMockRequest()
      const context = createMockContext()

      const response = await livenessProbe(request, context)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
      })
    })

    it('should include valid timestamp', async () => {
      const request = createMockRequest()
      const context = createMockContext()

      const response = await livenessProbe(request, context)

      const timestamp = response.jsonBody.timestamp
      expect(new Date(timestamp).toISOString()).toBe(timestamp)
    })
  })
})
