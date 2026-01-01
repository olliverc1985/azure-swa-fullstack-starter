import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { v4 as uuidv4 } from 'uuid'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest, requireAdmin } from '../shared/auth'
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorisedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../shared/http'

interface LineItem {
  date: string
  description: string
  amount: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  billingEmail: string
  billingAddress: {
    line1?: string
    line2?: string
    line3?: string
    line4?: string
    postcode?: string
  }
  invoiceDate: string
  dueDate: string
  periodStart: string
  periodEnd: string
  lineItems: LineItem[]
  subtotal: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  paidDate?: string
  createdAt: string
  updatedAt: string
}

interface Client {
  id: string
  firstName: string
  surname: string
  concatName: string
  email: string
  // Primary address (person's address)
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
  postcode?: string
  // Separate billing address for invoices
  billingAddress?: {
    line1?: string
    line2?: string
    line3?: string
    line4?: string
    postcode?: string
  }
  useSeparateBillingAddress?: boolean
  // Invoice email (if different from main email)
  invoiceEmail?: string
  rate: number
  isActive: boolean
}

type PaymentType = 'cash' | 'invoice'
type AttendanceStatus = 'present' | 'late-cancellation' | 'absent'

interface RegisterEntry {
  id: string
  clientId: string
  clientName: string
  date: string
  attendanceStatus?: AttendanceStatus // New field
  attended: boolean // Legacy field for backwards compatibility
  payment: number
  paymentType?: PaymentType // Optional for backwards compatibility
}

// GET /api/invoices - List all invoices
export async function getInvoices(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/invoices')

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Admin access required') : unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.INVOICES)
    const { resources } = await container.items
      .query({ query: 'SELECT * FROM c ORDER BY c.invoiceDate DESC' })
      .fetchAll()

    return successResponse(resources)
  } catch (error: any) {
    // If container doesn't exist yet, return empty array
    if (error?.code === 404 || error?.code === 'NotFound') {
      return successResponse([])
    }
    context.error('Failed to fetch invoices:', error)
    return serverErrorResponse('Failed to fetch invoices')
  }
}

// POST /api/invoices/generate - Generate invoices for a month
export async function generateInvoices(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/invoices/generate')

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Admin access required') : unauthorisedResponse()
  }

  try {
    const body = await request.json() as { year: number; month: number; regenerate?: boolean }
    
    if (!body.year || !body.month) {
      return badRequestResponse('Year and month are required')
    }

    const { year, month, regenerate } = body
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    // Get the last day of the month (day 0 of next month = last day of current month)
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long' })

    // Get all clients
    const clientsContainer = getContainer(CONTAINERS.CLIENTS)
    const { resources: clients } = await clientsContainer.items
      .query<Client>({ query: 'SELECT * FROM c WHERE c.isActive = true' })
      .fetchAll()

    // Get register entries for the month (only invoice payments, not cash)
    // Billable entries: present OR late-cancellation OR (legacy: attended=true with no status)
    // Include entries where paymentType is 'invoice' OR where paymentType is not defined (backwards compatibility)
    const registerContainer = getContainer(CONTAINERS.REGISTER)
    const { resources: registerEntries } = await registerContainer.items
      .query<RegisterEntry>({
        query: `SELECT * FROM c 
                WHERE c.date >= @start AND c.date <= @end 
                AND (
                  c.attendanceStatus IN ('present', 'late-cancellation')
                  OR (c.attended = true AND NOT IS_DEFINED(c.attendanceStatus))
                )
                AND (NOT IS_DEFINED(c.paymentType) OR c.paymentType = @invoiceType) 
                ORDER BY c.date`,
        parameters: [
          { name: '@start', value: monthStart },
          { name: '@end', value: monthEnd },
          { name: '@invoiceType', value: 'invoice' }
        ]
      })
      .fetchAll()

    // Group register entries by client
    const entriesByClient = new Map<string, RegisterEntry[]>()
    for (const entry of registerEntries) {
      const existing = entriesByClient.get(entry.clientId) || []
      existing.push(entry)
      entriesByClient.set(entry.clientId, existing)
    }

    // Generate invoices
    const invoicesContainer = getContainer(CONTAINERS.INVOICES)

    // If regenerate flag is set, delete existing invoices for this month
    if (regenerate) {
      const { resources: existingInvoices } = await invoicesContainer.items
        .query<Invoice>({
          query: 'SELECT * FROM c WHERE c.periodStart = @start',
          parameters: [{ name: '@start', value: monthStart }]
        })
        .fetchAll()

      for (const inv of existingInvoices) {
        await invoicesContainer.item(inv.id, inv.clientId).delete()
        context.info(`Deleted existing invoice ${inv.invoiceNumber} for regeneration`)
      }
    }
    const invoices: Invoice[] = []
    const now = new Date()
    const invoiceDate = now.toISOString().split('T')[0]
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    for (const client of clients) {
      const clientEntries = entriesByClient.get(client.id)
      
      if (!clientEntries || clientEntries.length === 0) {
        continue // No sessions for this client
      }

      // Generate invoice number: YYYYMM-FirstLastInitials
      const initials = `${client.firstName.substring(0, 2)}${client.surname.substring(0, 2)}`.replace(/\s/g, '')
      const baseInvoiceNumber = `${year}${String(month).padStart(2, '0')}-${initials}`

      // Check if invoice already exists for this client/period (by clientId, not invoice number)
      const { resources: existingForClient } = await invoicesContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.clientId = @clientId AND c.periodStart = @start',
          parameters: [
            { name: '@clientId', value: client.id },
            { name: '@start', value: monthStart }
          ]
        })
        .fetchAll()

      if (existingForClient.length > 0) {
        context.info(`Invoice for ${client.concatName} already exists for this period, skipping`)
        invoices.push(existingForClient[0] as Invoice)
        continue
      }

      // Find a unique invoice number (handle collisions with different clients who have same initials)
      let invoiceNumber = baseInvoiceNumber
      let suffix = 1
      const maxAttempts = 100 // Safety limit to prevent infinite loops
      
      while (suffix <= maxAttempts) {
        const { resources: existingWithNumber } = await invoicesContainer.items
          .query({
            query: 'SELECT * FROM c WHERE c.invoiceNumber = @num',
            parameters: [{ name: '@num', value: invoiceNumber }]
          })
          .fetchAll()

        if (existingWithNumber.length === 0) {
          break // This invoice number is available
        }

        // Number already taken by another client, try next suffix
        suffix++
        if (suffix > maxAttempts) {
          context.error(`Failed to generate unique invoice number for ${client.concatName} after ${maxAttempts} attempts`)
          throw new Error(`Invoice number collision limit exceeded for ${client.concatName}`)
        }
        invoiceNumber = `${baseInvoiceNumber}-${suffix}`
        context.info(`Invoice number collision, trying ${invoiceNumber}`)
      }

      // Create line items - all billable entries shown as Session
      // (Late cancellations are tracked in the register but invoiced as regular sessions)
      const lineItems: LineItem[] = clientEntries.map(entry => {
        const dateStr = new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
        return {
          date: entry.date,
          description: `Session - ${dateStr}`,
          amount: entry.payment || client.rate,
        }
      })

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)

      // Use billing address if set, otherwise fall back to primary address
      const invoiceBillingAddress = client.useSeparateBillingAddress && client.billingAddress
        ? {
            line1: client.billingAddress.line1,
            line2: client.billingAddress.line2,
            line3: client.billingAddress.line3,
            line4: client.billingAddress.line4,
            postcode: client.billingAddress.postcode,
          }
        : {
            line1: client.addressLine1,
            line2: client.addressLine2,
            line3: client.addressLine3,
            line4: client.addressLine4,
            postcode: client.postcode,
          }

      // Use invoice email if set, otherwise fall back to main email
      const invoiceBillingEmail = client.invoiceEmail || client.email

      const invoice: Invoice = {
        id: uuidv4(),
        invoiceNumber,
        clientId: client.id,
        clientName: client.concatName,
        billingEmail: invoiceBillingEmail,
        billingAddress: invoiceBillingAddress,
        invoiceDate,
        dueDate,
        periodStart: monthStart,
        periodEnd: monthEnd,
        lineItems,
        subtotal,
        total: subtotal, // No tax
        status: 'draft',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await invoicesContainer.items.create(invoice)
      invoices.push(invoice)
      context.info(`Generated invoice ${invoiceNumber} for ${client.concatName}: £${subtotal}`)
    }

    context.info(`Generated ${invoices.length} invoices for ${monthName} ${year}`)
    return createdResponse(invoices, `Generated ${invoices.length} invoices for ${monthName} ${year}`)
  } catch (error) {
    context.error('Failed to generate invoices:', error)
    return serverErrorResponse('Failed to generate invoices')
  }
}

// PUT /api/invoices/{id}/status - Update invoice status
export async function updateInvoiceStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const invoiceId = request.params.id
  context.info(`PUT /api/invoices/${invoiceId}/status`)

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Admin access required') : unauthorisedResponse()
  }

  try {
    const body = await request.json() as { status: Invoice['status']; paidDate?: string }
    
    if (!body.status) {
      return badRequestResponse('Status is required')
    }

    const container = getContainer(CONTAINERS.INVOICES)
    
    // Query to find the invoice - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: invoiceId }]
      })
      .fetchAll()
    
    if (resources.length === 0) {
      return notFoundResponse('Invoice not found')
    }

    const existing = resources[0] as Invoice

    const updated: Invoice = {
      ...existing,
      status: body.status,
      paidDate: body.status === 'paid' ? (body.paidDate || new Date().toISOString().split('T')[0]) : existing.paidDate,
      updatedAt: new Date().toISOString(),
    }

    // Use clientId as partition key (as defined in CosmosDB container)
    await container.item(invoiceId, existing.clientId).replace(updated)

    context.info(`Invoice ${existing.invoiceNumber} status updated to ${body.status}`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update invoice status:', error)
    return serverErrorResponse('Failed to update invoice status')
  }
}

// GET /api/invoices/{id} - Get single invoice
export async function getInvoice(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const invoiceId = request.params.id
  context.info(`GET /api/invoices/${invoiceId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.INVOICES)
    
    // Query to find the invoice - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: invoiceId }]
      })
      .fetchAll()
    
    if (resources.length === 0) {
      return notFoundResponse('Invoice not found')
    }

    return successResponse(resources[0])
  } catch (error) {
    context.error('Failed to fetch invoice:', error)
    return serverErrorResponse('Failed to fetch invoice')
  }
}

// Register routes
app.http('invoices-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices',
  handler: getInvoices,
})

app.http('invoices-generate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invoices/generate',
  handler: generateInvoices,
})

app.http('invoices-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invoices/{id}',
  handler: getInvoice,
})

app.http('invoices-status', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'invoices/{id}/status',
  handler: updateInvoiceStatus,
})


