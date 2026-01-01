import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getContainer, CONTAINERS } from '../shared/database'
import { verifyPassword, generateToken, sanitiseUser, User, checkRateLimit, resetRateLimit, getClientIp } from '../shared/auth'
import { successResponse, badRequestResponse, unauthorisedResponse, serverErrorResponse } from '../shared/http'

interface LoginRequest {
  email: string
  password: string
}

export async function authLogin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/auth/login')

  // Rate limiting
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(clientIp)
  
  if (!rateLimit.allowed) {
    context.warn(`Rate limit exceeded for IP: ${clientIp}`)
    return {
      status: 429,
      jsonBody: {
        success: false,
        message: `Too many login attempts. Please try again in ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`,
      },
    }
  }

  try {
    const body = await request.json() as LoginRequest

    // Basic validation
    if (!body.email || !body.password) {
      return badRequestResponse('Email and password are required')
    }

    const email = body.email.toLowerCase().trim()
    const container = getContainer(CONTAINERS.USERS)

    // Find user by email
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }],
      })
      .fetchAll()

    if (resources.length === 0) {
      return unauthorisedResponse('Invalid email or password')
    }

    const user = resources[0] as User

    // Verify password
    const isValid = await verifyPassword(body.password, user.passwordHash)
    if (!isValid) {
      return unauthorisedResponse('Invalid email or password')
    }

    // Reset rate limit on successful login
    resetRateLimit(clientIp)

    // Generate token with tokenVersion for session invalidation
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion || 1,
    })

    context.info(`User ${user.email} logged in successfully`)

    return successResponse({
      token,
      user: sanitiseUser(user),
    })
  } catch (error) {
    context.error('Login error:', error)
    return serverErrorResponse('Login failed')
  }
}

app.http('auth-login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: authLogin,
})


