import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getCosmosClient } from '../shared/database'
import { jsonResponse } from '../shared/http'

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      latencyMs?: number
      error?: string
    }
  }
}

// Track when the function app started
const startTime = Date.now()

// App version - could be injected via environment variable in production
const APP_VERSION = process.env.APP_VERSION || '1.0.0'

/**
 * Health check endpoint for monitoring and load balancer health probes
 * 
 * Returns:
 * - 200 OK: All systems healthy
 * - 200 OK with degraded status: Some non-critical systems have issues
 * - 503 Service Unavailable: Critical systems (database) are down
 */
export async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/health')

  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: {
        status: 'healthy',
      },
    },
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const client = getCosmosClient()
    
    // Simple connectivity check - read database account
    await client.getDatabaseAccount()
    
    response.checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
    }
  } catch (error) {
    context.error('Health check - database connection failed:', error)
    response.checks.database = {
      status: 'unhealthy',
      error: 'Database connection failed',
    }
    response.status = 'unhealthy'
  }

  // Return appropriate HTTP status based on health
  const httpStatus = response.status === 'unhealthy' ? 503 : 200

  return jsonResponse(httpStatus, response)
}

/**
 * Simple liveness probe - just confirms the function is running
 * Use this for Kubernetes liveness probes or simple uptime monitoring
 */
export async function livenessProbe(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return jsonResponse(200, { status: 'alive', timestamp: new Date().toISOString() })
}

// Full health check endpoint
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
})

// Simple liveness probe
app.http('health-live', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health/live',
  handler: livenessProbe,
})
