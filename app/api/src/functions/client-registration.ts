import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { v4 as uuidv4 } from 'uuid'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest, requireAdmin, getClientIp } from '../shared/auth'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorisedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../shared/http'

// ============================================
// Security: Registration-specific Rate Limiting
// More generous than login (10/hour per IP) but still protective
// ============================================
interface RegistrationRateLimitRecord {
  count: number
  resetAt: number
  dailyCount: number
  dailyResetAt: number
}

const registrationAttempts = new Map<string, RegistrationRateLimitRecord>()
const REGISTRATION_RATE_LIMIT_HOURLY = 10  // Max 10 per hour per IP
const REGISTRATION_RATE_LIMIT_DAILY = 25   // Max 25 per day per IP (safety net)
const REGISTRATION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const REGISTRATION_RATE_LIMIT_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

// Minimum time to fill form (in ms) - submissions faster than this are likely bots
const MIN_FORM_COMPLETION_TIME_MS = 5000 // 5 seconds minimum

function checkRegistrationRateLimit(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now()
  const record = registrationAttempts.get(ip)
  
  // Clean up old entries periodically
  if (registrationAttempts.size > 500) {
    for (const [key, val] of registrationAttempts.entries()) {
      if (now > val.dailyResetAt) registrationAttempts.delete(key)
    }
  }
  
  if (!record || now > record.dailyResetAt) {
    // Fresh record
    registrationAttempts.set(ip, { 
      count: 1, 
      resetAt: now + REGISTRATION_RATE_LIMIT_WINDOW_MS,
      dailyCount: 1,
      dailyResetAt: now + REGISTRATION_RATE_LIMIT_DAILY_WINDOW_MS
    })
    return { allowed: true }
  }
  
  // Check daily limit first
  if (record.dailyCount >= REGISTRATION_RATE_LIMIT_DAILY) {
    return { 
      allowed: false, 
      message: 'Daily submission limit reached. Please try again tomorrow.' 
    }
  }
  
  // Reset hourly counter if window expired
  if (now > record.resetAt) {
    record.count = 1
    record.resetAt = now + REGISTRATION_RATE_LIMIT_WINDOW_MS
    record.dailyCount++
    return { allowed: true }
  }
  
  // Check hourly limit
  if (record.count >= REGISTRATION_RATE_LIMIT_HOURLY) {
    const minutesRemaining = Math.ceil((record.resetAt - now) / 60000)
    return { 
      allowed: false, 
      message: `Too many submissions. Please try again in ${minutesRemaining} minutes.` 
    }
  }
  
  record.count++
  record.dailyCount++
  return { allowed: true }
}

// ============================================
// Security: Input Sanitisation
// ============================================
function sanitiseString(input: string | undefined, maxLength: number = 500): string {
  if (!input) return ''
  // Remove any potential script tags or dangerous content
  return input
    .substring(0, maxLength)
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim()
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

function isValidPhone(phone: string): boolean {
  // Allow common UK phone formats
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return /^(\+44|0)[0-9]{9,11}$/.test(cleaned)
}

function isValidPostcode(postcode: string): boolean {
  // UK postcode validation
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
  return postcodeRegex.test(postcode.trim())
}

// ============================================
// Types
// ============================================
interface Address {
  line1?: string
  line2?: string
  line3?: string  // Town/City
  line4?: string  // County
  postcode?: string
}

interface EmergencyContact {
  name: string
  relationship: string
  phoneNumber: string
  email?: string
}

interface ClientRegistration {
  id: string
  // Personal details
  firstName: string
  surname: string
  dateOfBirth: string
  email: string
  contactNumber: string
  // Primary address
  addressLine1: string
  addressLine2?: string
  addressLine3: string  // Town/City
  addressLine4?: string // County
  postcode: string
  // Emergency contact
  emergencyContact: EmergencyContact
  // Important info
  importantInfo?: string
  // Consent
  photoConsent?: boolean  // Consent to use photos on social media
  // Billing (optional)
  invoiceEmail?: string
  billingAddress?: Address
  useSeparateBillingAddress?: boolean
  // Metadata
  submittedAt: string
  reviewed: boolean
  reviewedAt?: string
  reviewedBy?: string
  notes?: string // Admin notes about the registration
  // Security metadata
  submissionIp?: string
  userAgent?: string
}

// POST /api/client-registration - Public endpoint for clients to submit registration
export async function submitRegistration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const clientIp = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  context.info(`POST /api/client-registration from IP: ${clientIp.substring(0, 10)}***`)

  // ============================================
  // Security Layer 1: Rate Limiting
  // ============================================
  const rateLimit = checkRegistrationRateLimit(clientIp)
  
  if (!rateLimit.allowed) {
    context.warn(`🚨 RATE LIMIT: Registration rate limit exceeded for IP: ${clientIp}`)
    return {
      status: 429,
      jsonBody: {
        success: false,
        message: rateLimit.message || 'Too many submissions. Please try again later.',
      },
    }
  }

  try {
    const body = await request.json() as Partial<ClientRegistration> & { 
      _honeypot?: string  // Honeypot field - should be empty
      _formLoadTime?: number // Timestamp when form was loaded
    }

    // ============================================
    // Security Layer 2: Honeypot Detection
    // Bots typically fill all fields including hidden ones
    // ============================================
    if (body._honeypot && body._honeypot.trim() !== '') {
      context.warn(`🚨 HONEYPOT: Bot detected (honeypot filled) from IP: ${clientIp}`)
      // Return success to not tip off the bot, but don't save
      return createdResponse({ 
        message: 'Registration submitted successfully',
        id: 'processed' 
      })
    }

    // ============================================
    // Security Layer 3: Time-based Validation
    // Reject submissions that are too fast (likely bots)
    // ============================================
    if (body._formLoadTime) {
      const submissionTime = Date.now() - body._formLoadTime
      if (submissionTime < MIN_FORM_COMPLETION_TIME_MS) {
        context.warn(`🚨 TOO FAST: Suspiciously fast submission (${submissionTime}ms) from IP: ${clientIp}`)
        // Return success to not tip off the bot, but don't save
        return createdResponse({ 
          message: 'Registration submitted successfully',
          id: 'processed' 
        })
      }
    }

    // ============================================
    // Security Layer 4: Input Validation
    // ============================================
    
    // Validate required fields
    const requiredFields = [
      'firstName', 'surname', 'dateOfBirth', 'email', 'contactNumber',
      'addressLine1', 'addressLine3', 'postcode'
    ]
    
    for (const field of requiredFields) {
      if (!body[field as keyof typeof body]) {
        return badRequestResponse(`${field} is required`)
      }
    }

    // Validate emergency contact
    if (!body.emergencyContact?.name || !body.emergencyContact?.relationship || !body.emergencyContact?.phoneNumber) {
      return badRequestResponse('Emergency contact name, relationship, and phone number are required')
    }

    // Validate email format
    if (!isValidEmail(body.email!)) {
      return badRequestResponse('Please enter a valid email address')
    }

    // Validate phone format (lenient - just check it looks like a UK number)
    if (!isValidPhone(body.contactNumber!)) {
      return badRequestResponse('Please enter a valid UK phone number')
    }

    // Validate postcode format
    if (!isValidPostcode(body.postcode!)) {
      return badRequestResponse('Please enter a valid UK postcode')
    }

    // Validate emergency contact phone
    if (!isValidPhone(body.emergencyContact.phoneNumber)) {
      return badRequestResponse('Please enter a valid emergency contact phone number')
    }

    // ============================================
    // Security Layer 5: Input Sanitisation
    // ============================================
    const now = new Date().toISOString()
    const registration: ClientRegistration = {
      id: uuidv4(),
      firstName: sanitiseString(body.firstName, 100),
      surname: sanitiseString(body.surname, 100),
      dateOfBirth: body.dateOfBirth!.trim(),
      email: body.email!.toLowerCase().trim().substring(0, 254),
      contactNumber: sanitiseString(body.contactNumber, 20),
      addressLine1: sanitiseString(body.addressLine1, 200),
      addressLine2: sanitiseString(body.addressLine2, 200),
      addressLine3: sanitiseString(body.addressLine3, 100),
      addressLine4: sanitiseString(body.addressLine4, 100),
      postcode: body.postcode!.trim().toUpperCase().substring(0, 10),
      emergencyContact: {
        name: sanitiseString(body.emergencyContact!.name, 100),
        relationship: sanitiseString(body.emergencyContact!.relationship, 50),
        phoneNumber: sanitiseString(body.emergencyContact!.phoneNumber, 20),
        email: body.emergencyContact!.email?.toLowerCase().trim().substring(0, 254),
      },
      importantInfo: sanitiseString(body.importantInfo, 2000),
      photoConsent: body.photoConsent === true,
      invoiceEmail: body.invoiceEmail?.toLowerCase().trim().substring(0, 254),
      billingAddress: body.billingAddress ? {
        line1: sanitiseString(body.billingAddress.line1, 200),
        line2: sanitiseString(body.billingAddress.line2, 200),
        line3: sanitiseString(body.billingAddress.line3, 100),
        line4: sanitiseString(body.billingAddress.line4, 100),
        postcode: body.billingAddress.postcode?.trim().toUpperCase().substring(0, 10),
      } : undefined,
      useSeparateBillingAddress: body.useSeparateBillingAddress || false,
      submittedAt: now,
      reviewed: false,
      // Store security metadata for audit
      submissionIp: clientIp,
      userAgent: userAgent.substring(0, 500),
    }

    const container = getContainer(CONTAINERS.REGISTRATIONS)
    await container.items.create(registration)

    // ============================================
    // Alerting: Log successful submissions for monitoring
    // ============================================
    context.info(`✅ REGISTRATION: New registration submitted`)
    context.info(`   Name: ${registration.firstName} ${registration.surname}`)
    context.info(`   Email: ${registration.email}`)
    context.info(`   IP: ${clientIp}`)
    
    return createdResponse({ 
      message: 'Registration submitted successfully',
      id: registration.id 
    })
  } catch (error) {
    context.error('❌ REGISTRATION ERROR:', error)
    return serverErrorResponse('Failed to submit registration')
  }
}

// GET /api/registrations - List all registrations (admin only)
export async function getRegistrations(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/registrations')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Admin access required')
  }

  try {
    const reviewed = request.query.get('reviewed')
    const container = getContainer(CONTAINERS.REGISTRATIONS)
    
    let query = 'SELECT * FROM c'
    const parameters: { name: string; value: boolean }[] = []

    if (reviewed !== null) {
      query += ' WHERE c.reviewed = @reviewed'
      parameters.push({ name: '@reviewed', value: reviewed === 'true' })
    }

    query += ' ORDER BY c.submittedAt DESC'

    const { resources } = await container.items.query({ query, parameters }).fetchAll()

    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch registrations:', error)
    return serverErrorResponse('Failed to fetch registrations')
  }
}

// GET /api/registrations/{id} - Get a single registration (admin only)
export async function getRegistrationById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const registrationId = request.params.id
  context.info(`GET /api/registrations/${registrationId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Admin access required')
  }

  try {
    const container = getContainer(CONTAINERS.REGISTRATIONS)
    const { resource } = await container.item(registrationId, registrationId).read<ClientRegistration>()

    if (!resource) {
      return notFoundResponse('Registration not found')
    }

    return successResponse(resource)
  } catch (error) {
    context.error('Failed to fetch registration:', error)
    return serverErrorResponse('Failed to fetch registration')
  }
}

// PUT /api/registrations/{id} - Update a registration (admin only - mainly for marking reviewed)
export async function updateRegistration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const registrationId = request.params.id
  context.info(`PUT /api/registrations/${registrationId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Admin access required')
  }

  try {
    const body = await request.json() as Partial<ClientRegistration>
    const container = getContainer(CONTAINERS.REGISTRATIONS)

    // Find existing registration
    const { resource: existing } = await container.item(registrationId, registrationId).read<ClientRegistration>()
    if (!existing) {
      return notFoundResponse('Registration not found')
    }

    // Update fields (primarily for marking as reviewed and adding notes)
    const updated: ClientRegistration = {
      ...existing,
      reviewed: body.reviewed !== undefined ? body.reviewed : existing.reviewed,
      reviewedAt: body.reviewed === true && !existing.reviewed ? new Date().toISOString() : existing.reviewedAt,
      reviewedBy: body.reviewed === true && !existing.reviewed ? auth.userId : existing.reviewedBy,
      notes: body.notes !== undefined ? body.notes?.trim() : existing.notes,
    }

    await container.item(registrationId, registrationId).replace(updated)

    context.info(`Registration ${registrationId} updated`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update registration:', error)
    return serverErrorResponse('Failed to update registration')
  }
}

// DELETE /api/registrations/{id} - Delete a registration (admin only)
export async function deleteRegistration(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const registrationId = request.params.id
  context.info(`DELETE /api/registrations/${registrationId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Admin access required')
  }

  try {
    const container = getContainer(CONTAINERS.REGISTRATIONS)

    // Check if exists
    const { resource: existing } = await container.item(registrationId, registrationId).read<ClientRegistration>()
    if (!existing) {
      return notFoundResponse('Registration not found')
    }

    // Hard delete
    await container.item(registrationId, registrationId).delete()

    context.info(`Registration ${registrationId} deleted`)
    return successResponse({ message: 'Registration deleted successfully' })
  } catch (error) {
    context.error('Failed to delete registration:', error)
    return serverErrorResponse('Failed to delete registration')
  }
}

// Register routes
// Public endpoint - no auth required
app.http('client-registration-submit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'client-registration',
  handler: submitRegistration,
})

// Admin endpoints
app.http('registrations-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'registrations',
  handler: getRegistrations,
})

app.http('registrations-get-by-id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'registrations/{id}',
  handler: getRegistrationById,
})

app.http('registrations-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'registrations/{id}',
  handler: updateRegistration,
})

app.http('registrations-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'registrations/{id}',
  handler: deleteRegistration,
})




