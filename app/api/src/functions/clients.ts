import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { v4 as uuidv4 } from 'uuid'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest } from '../shared/auth'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorisedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../shared/http'

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type PaymentMethod = 'cash' | 'invoice'

// Reusable Address interface
interface Address {
  line1?: string
  line2?: string
  line3?: string  // Town/City
  line4?: string  // County
  postcode?: string
}

// Emergency Contact interface
interface EmergencyContact {
  name: string
  relationship: string
  phoneNumber: string
  email?: string
}

interface Client {
  id: string
  firstName: string
  surname: string
  concatName: string
  dateOfBirth?: string // ISO date string YYYY-MM-DD
  contactNumber?: string
  email: string
  // Primary address (person's address)
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
  postcode?: string
  // Separate billing address for invoices
  billingAddress?: Address
  useSeparateBillingAddress?: boolean
  // Separate correspondence address (if different from primary)
  correspondenceAddress?: Address
  useSeparateCorrespondenceAddress?: boolean
  // Invoice email (if different from main email)
  invoiceEmail?: string
  // Emergency contact details
  emergencyContact?: EmergencyContact
  rate: number
  notes?: string
  importantInfo?: string
  attendingDays?: DayOfWeek[]
  paymentMethod: PaymentMethod
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// GET /api/clients - List all clients
export async function getClients(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/clients')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.CLIENTS)
    const { resources } = await container.items
      .query({ query: 'SELECT * FROM c ORDER BY c.concatName' })
      .fetchAll()

    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch clients:', error)
    return serverErrorResponse('Failed to fetch clients')
  }
}

// POST /api/clients - Create a new client
export async function createClient(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/clients')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<Client>

    if (!body.firstName || !body.surname || !body.email) {
      return badRequestResponse('First name, surname, and email are required')
    }

    const now = new Date().toISOString()
    const client: Client = {
      id: uuidv4(),
      firstName: body.firstName.trim(),
      surname: body.surname.trim(),
      concatName: `${body.firstName.trim()} ${body.surname.trim()}`,
      dateOfBirth: body.dateOfBirth?.trim(),
      contactNumber: body.contactNumber?.trim(),
      email: body.email.toLowerCase().trim(),
      // Primary address
      addressLine1: body.addressLine1?.trim(),
      addressLine2: body.addressLine2?.trim(),
      addressLine3: body.addressLine3?.trim(),
      addressLine4: body.addressLine4?.trim(),
      postcode: body.postcode?.trim().toUpperCase(),
      // Billing address
      billingAddress: body.billingAddress ? {
        line1: body.billingAddress.line1?.trim(),
        line2: body.billingAddress.line2?.trim(),
        line3: body.billingAddress.line3?.trim(),
        line4: body.billingAddress.line4?.trim(),
        postcode: body.billingAddress.postcode?.trim().toUpperCase(),
      } : undefined,
      useSeparateBillingAddress: body.useSeparateBillingAddress || false,
      // Correspondence address
      correspondenceAddress: body.correspondenceAddress ? {
        line1: body.correspondenceAddress.line1?.trim(),
        line2: body.correspondenceAddress.line2?.trim(),
        line3: body.correspondenceAddress.line3?.trim(),
        line4: body.correspondenceAddress.line4?.trim(),
        postcode: body.correspondenceAddress.postcode?.trim().toUpperCase(),
      } : undefined,
      useSeparateCorrespondenceAddress: body.useSeparateCorrespondenceAddress || false,
      // Invoice email
      invoiceEmail: body.invoiceEmail?.toLowerCase().trim(),
      // Emergency contact
      emergencyContact: body.emergencyContact ? {
        name: body.emergencyContact.name?.trim() || '',
        relationship: body.emergencyContact.relationship?.trim() || '',
        phoneNumber: body.emergencyContact.phoneNumber?.trim() || '',
        email: body.emergencyContact.email?.toLowerCase().trim(),
      } : undefined,
      rate: body.rate || 40,
      notes: body.notes?.trim(),
      importantInfo: body.importantInfo?.trim(),
      attendingDays: body.attendingDays || [],
      paymentMethod: body.paymentMethod || 'invoice', // Default to invoice
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    const container = getContainer(CONTAINERS.CLIENTS)
    await container.items.create(client)

    context.info(`Client ${client.concatName} created`)
    return createdResponse(client)
  } catch (error) {
    context.error('Failed to create client:', error)
    return serverErrorResponse('Failed to create client')
  }
}

// PUT /api/clients/{id} - Update a client
export async function updateClient(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const clientId = request.params.id
  context.info(`PUT /api/clients/${clientId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<Client>
    const container = getContainer(CONTAINERS.CLIENTS)

    // Find existing client
    const { resource: existing } = await container.item(clientId, clientId).read<Client>()
    if (!existing) {
      return notFoundResponse('Client not found')
    }

    // Update fields
    const updated: Client = {
      ...existing,
      firstName: body.firstName?.trim() || existing.firstName,
      surname: body.surname?.trim() || existing.surname,
      concatName: body.firstName || body.surname
        ? `${(body.firstName?.trim() || existing.firstName)} ${(body.surname?.trim() || existing.surname)}`
        : existing.concatName,
      dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth?.trim() : existing.dateOfBirth,
      contactNumber: body.contactNumber !== undefined ? body.contactNumber?.trim() : existing.contactNumber,
      email: body.email?.toLowerCase().trim() || existing.email,
      // Primary address
      addressLine1: body.addressLine1 !== undefined ? body.addressLine1?.trim() : existing.addressLine1,
      addressLine2: body.addressLine2 !== undefined ? body.addressLine2?.trim() : existing.addressLine2,
      addressLine3: body.addressLine3 !== undefined ? body.addressLine3?.trim() : existing.addressLine3,
      addressLine4: body.addressLine4 !== undefined ? body.addressLine4?.trim() : existing.addressLine4,
      postcode: body.postcode !== undefined ? body.postcode?.trim().toUpperCase() : existing.postcode,
      // Billing address
      billingAddress: body.billingAddress !== undefined ? (body.billingAddress ? {
        line1: body.billingAddress.line1?.trim(),
        line2: body.billingAddress.line2?.trim(),
        line3: body.billingAddress.line3?.trim(),
        line4: body.billingAddress.line4?.trim(),
        postcode: body.billingAddress.postcode?.trim().toUpperCase(),
      } : undefined) : existing.billingAddress,
      useSeparateBillingAddress: body.useSeparateBillingAddress !== undefined 
        ? body.useSeparateBillingAddress 
        : existing.useSeparateBillingAddress,
      // Correspondence address
      correspondenceAddress: body.correspondenceAddress !== undefined ? (body.correspondenceAddress ? {
        line1: body.correspondenceAddress.line1?.trim(),
        line2: body.correspondenceAddress.line2?.trim(),
        line3: body.correspondenceAddress.line3?.trim(),
        line4: body.correspondenceAddress.line4?.trim(),
        postcode: body.correspondenceAddress.postcode?.trim().toUpperCase(),
      } : undefined) : existing.correspondenceAddress,
      useSeparateCorrespondenceAddress: body.useSeparateCorrespondenceAddress !== undefined 
        ? body.useSeparateCorrespondenceAddress 
        : existing.useSeparateCorrespondenceAddress,
      // Invoice email
      invoiceEmail: body.invoiceEmail !== undefined 
        ? body.invoiceEmail?.toLowerCase().trim() 
        : existing.invoiceEmail,
      // Emergency contact
      emergencyContact: body.emergencyContact !== undefined ? (body.emergencyContact ? {
        name: body.emergencyContact.name?.trim() || '',
        relationship: body.emergencyContact.relationship?.trim() || '',
        phoneNumber: body.emergencyContact.phoneNumber?.trim() || '',
        email: body.emergencyContact.email?.toLowerCase().trim(),
      } : undefined) : existing.emergencyContact,
      rate: body.rate !== undefined ? body.rate : existing.rate,
      notes: body.notes !== undefined ? body.notes?.trim() : existing.notes,
      importantInfo: body.importantInfo !== undefined ? body.importantInfo?.trim() : existing.importantInfo,
      attendingDays: body.attendingDays !== undefined ? body.attendingDays : existing.attendingDays,
      paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : (existing.paymentMethod || 'invoice'),
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      updatedAt: new Date().toISOString(),
    }

    await container.item(clientId, clientId).replace(updated)

    context.info(`Client ${updated.concatName} updated`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update client:', error)
    return serverErrorResponse('Failed to update client')
  }
}

// GET /api/clients/{id} - Get a single client
export async function getClientById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const clientId = request.params.id
  context.info(`GET /api/clients/${clientId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.CLIENTS)
    const { resource } = await container.item(clientId, clientId).read<Client>()

    if (!resource) {
      return notFoundResponse('Client not found')
    }

    return successResponse(resource)
  } catch (error) {
    context.error('Failed to fetch client:', error)
    return serverErrorResponse('Failed to fetch client')
  }
}

// DELETE /api/clients/{id} - Delete a client (soft delete - marks as inactive)
export async function deleteClient(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const clientId = request.params.id
  context.info(`DELETE /api/clients/${clientId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.CLIENTS)
    const { resource: existing } = await container.item(clientId, clientId).read<Client>()

    if (!existing) {
      return notFoundResponse('Client not found')
    }

    // Soft delete - mark as inactive
    const updated: Client = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
    }

    await container.item(clientId, clientId).replace(updated)

    context.info(`Client ${existing.concatName} deleted (soft)`)
    return successResponse({ message: 'Client deleted successfully' })
  } catch (error) {
    context.error('Failed to delete client:', error)
    return serverErrorResponse('Failed to delete client')
  }
}

// Register routes
app.http('clients-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clients',
  handler: getClients,
})

app.http('clients-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'clients',
  handler: createClient,
})

app.http('clients-get-by-id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clients/{id}',
  handler: getClientById,
})

app.http('clients-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'clients/{id}',
  handler: updateClient,
})

app.http('clients-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'clients/{id}',
  handler: deleteClient,
})


