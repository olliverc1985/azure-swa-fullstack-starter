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

type PaymentType = 'cash' | 'invoice'

// Attendance status for tracking presence vs billable sessions
// - 'present': Physically in the building, billable
// - 'late-cancellation': Not present, but billable (cancelled with <24hr notice)
// - 'absent': Not present, not billable (cancelled with proper notice or no-show not charged)
type AttendanceStatus = 'present' | 'late-cancellation' | 'absent'

interface RegisterEntry {
  id: string
  clientId: string
  clientName: string
  date: string
  // New attendance status field (primary)
  attendanceStatus?: AttendanceStatus
  // Legacy field - kept for backwards compatibility with existing data
  attended: boolean
  payment: number
  paymentType: PaymentType
  invoiceCode: string
  notes?: string
  // Cash owed tracking
  cashOwed?: number // Amount of cash owed if payment was delayed
  cashOwedPaidDate?: string // When the owed cash was actually paid
  cashOwedPaidBy?: string // User ID who recorded the payment
  createdAt: string
  createdBy: string
}

// GET /api/register - Get register entries by date or month
export async function getRegister(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/register')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const date = request.query.get('date')
    const year = request.query.get('year')
    const month = request.query.get('month')

    const container = getContainer(CONTAINERS.REGISTER)
    let query: string
    let parameters: { name: string; value: string | number }[] = []

    if (date) {
      // Get entries for a specific date
      query = 'SELECT * FROM c WHERE c.date = @date ORDER BY c.clientName'
      parameters = [{ name: '@date', value: date }]
    } else if (year && month) {
      // Get entries for a month
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const endDate = `${year}-${month.padStart(2, '0')}-31`
      query = 'SELECT * FROM c WHERE c.date >= @startDate AND c.date <= @endDate ORDER BY c.date, c.clientName'
      parameters = [
        { name: '@startDate', value: startDate },
        { name: '@endDate', value: endDate },
      ]
    } else {
      // Default: last 30 days
      const today = new Date()
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
      query = 'SELECT * FROM c WHERE c.date >= @startDate ORDER BY c.date DESC, c.clientName'
      parameters = [{ name: '@startDate', value: thirtyDaysAgo }]
    }

    const { resources } = await container.items.query({ query, parameters }).fetchAll()

    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch register:', error)
    return serverErrorResponse('Failed to fetch register')
  }
}

// POST /api/register - Create or update register entry (upsert by clientId+date)
export async function createRegisterEntry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/register')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<RegisterEntry>

    if (!body.clientId || !body.date || !body.clientName) {
      return badRequestResponse('Client ID, name, and date are required')
    }

    const container = getContainer(CONTAINERS.REGISTER)

    // Check if entry already exists for this client on this date
    const { resources: existing } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.clientId = @clientId AND c.date = @date',
        parameters: [
          { name: '@clientId', value: body.clientId },
          { name: '@date', value: body.date }
        ]
      })
      .fetchAll()

    // Generate invoice code from client name (first 2 letters of first and last name)
    const nameParts = body.clientName.split(' ')
    const invoiceCode = nameParts.length >= 2
      ? `${nameParts[0].slice(0, 2)}${nameParts[nameParts.length - 1].slice(0, 2)}`
      : body.clientName.slice(0, 4)

    const now = new Date().toISOString()

    if (existing.length > 0) {
      // Update existing entry
      const existingEntry = existing[0] as RegisterEntry
      // Handle cashOwed: 0 or null means clear it, undefined means keep existing
      const newCashOwed = body.cashOwed !== undefined 
        ? (body.cashOwed === 0 || body.cashOwed === null ? undefined : body.cashOwed) 
        : existingEntry.cashOwed
      
      // Determine attendance status - use new field if provided, otherwise derive from attended boolean
      let newAttendanceStatus: AttendanceStatus | undefined = body.attendanceStatus
      let newAttended: boolean
      
      if (body.attendanceStatus !== undefined) {
        // New field provided - derive attended from it
        newAttendanceStatus = body.attendanceStatus
        newAttended = body.attendanceStatus === 'present' || body.attendanceStatus === 'late-cancellation'
      } else if (body.attended !== undefined) {
        // Legacy: only attended boolean provided - keep existing status or default
        newAttended = body.attended
        newAttendanceStatus = existingEntry.attendanceStatus || (body.attended ? 'present' : 'absent')
      } else {
        // Neither provided - keep existing values
        newAttended = existingEntry.attended
        newAttendanceStatus = existingEntry.attendanceStatus
      }
      
      const updated: RegisterEntry = {
        ...existingEntry,
        clientName: body.clientName,
        attendanceStatus: newAttendanceStatus,
        attended: newAttended,
        payment: body.payment !== undefined ? body.payment : existingEntry.payment,
        paymentType: body.paymentType || existingEntry.paymentType || 'invoice',
        invoiceCode: invoiceCode.replace(/\s+/g, ''),
        notes: body.notes !== undefined ? body.notes?.trim() : existingEntry.notes,
        cashOwed: newCashOwed,
        cashOwedPaidDate: body.cashOwedPaidDate !== undefined ? body.cashOwedPaidDate : existingEntry.cashOwedPaidDate,
        cashOwedPaidBy: body.cashOwedPaidBy !== undefined ? body.cashOwedPaidBy : existingEntry.cashOwedPaidBy,
      }

      await container.item(existingEntry.id, existingEntry.date).replace(updated)
      context.info(`Register entry updated for ${updated.clientName} on ${updated.date} (status: ${updated.attendanceStatus})`)
      return successResponse(updated)
    }

    // Create new entry
    // Determine attendance status - use new field if provided, otherwise derive from attended boolean
    const attendanceStatus: AttendanceStatus = body.attendanceStatus || (body.attended !== false ? 'present' : 'absent')
    const attended = attendanceStatus === 'present' || attendanceStatus === 'late-cancellation'
    
    const entry: RegisterEntry = {
      id: uuidv4(),
      clientId: body.clientId,
      clientName: body.clientName,
      date: body.date,
      attendanceStatus,
      attended, // Legacy field - derived from attendanceStatus for backwards compat
      payment: body.payment || 40,
      paymentType: body.paymentType || 'invoice',
      invoiceCode: invoiceCode.replace(/\s+/g, ''),
      notes: body.notes?.trim(),
      cashOwed: body.cashOwed,
      cashOwedPaidDate: body.cashOwedPaidDate,
      cashOwedPaidBy: body.cashOwedPaidBy,
      createdAt: now,
      createdBy: auth.userId,
    }

    await container.items.create(entry)

    context.info(`Register entry created for ${entry.clientName} on ${entry.date}`)
    return createdResponse(entry)
  } catch (error) {
    context.error('Failed to create register entry:', error)
    return serverErrorResponse('Failed to create register entry')
  }
}

// POST /api/register/bulk - Create or update multiple register entries (upsert by clientId+date)
export async function createBulkRegisterEntries(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/register/bulk')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as { entries: Partial<RegisterEntry>[] }

    if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
      return badRequestResponse('Entries array is required')
    }

    const container = getContainer(CONTAINERS.REGISTER)
    const now = new Date().toISOString()
    const results: RegisterEntry[] = []
    let created = 0
    let updated = 0

    // Get the date from the first entry (bulk operations are typically for a single day)
    const targetDate = body.entries[0]?.date
    
    // Fetch all existing entries for this date in one query (more efficient)
    let existingEntries: RegisterEntry[] = []
    if (targetDate) {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.date = @date',
          parameters: [{ name: '@date', value: targetDate }]
        })
        .fetchAll()
      existingEntries = resources as RegisterEntry[]
    }
    
    // Create a map for quick lookup by clientId
    const existingByClientId = new Map<string, RegisterEntry>()
    existingEntries.forEach(e => existingByClientId.set(e.clientId, e))

    for (const entry of body.entries) {
      if (!entry.clientId || !entry.date || !entry.clientName) {
        continue // Skip invalid entries
      }

      const nameParts = entry.clientName.split(' ')
      const invoiceCode = nameParts.length >= 2
        ? `${nameParts[0].slice(0, 2)}${nameParts[nameParts.length - 1].slice(0, 2)}`
        : entry.clientName.slice(0, 4)

      // Check if entry exists for this client on this date
      const existingEntry = existingByClientId.get(entry.clientId)

      if (existingEntry && existingEntry.date === entry.date) {
        // Update existing entry
        // Handle cashOwed: 0 or null means clear it, undefined means keep existing
        const newCashOwed = entry.cashOwed !== undefined 
          ? (entry.cashOwed === 0 || entry.cashOwed === null ? undefined : entry.cashOwed) 
          : existingEntry.cashOwed
        
        // Determine attendance status - use new field if provided, otherwise derive from attended boolean
        let newAttendanceStatus: AttendanceStatus | undefined = entry.attendanceStatus as AttendanceStatus | undefined
        let newAttended: boolean
        
        if (entry.attendanceStatus !== undefined) {
          newAttendanceStatus = entry.attendanceStatus as AttendanceStatus
          newAttended = newAttendanceStatus === 'present' || newAttendanceStatus === 'late-cancellation'
        } else if (entry.attended !== undefined) {
          newAttended = entry.attended
          newAttendanceStatus = existingEntry.attendanceStatus || (entry.attended ? 'present' : 'absent')
        } else {
          newAttended = existingEntry.attended
          newAttendanceStatus = existingEntry.attendanceStatus
        }
        
        const updatedEntry: RegisterEntry = {
          ...existingEntry,
          clientName: entry.clientName,
          attendanceStatus: newAttendanceStatus,
          attended: newAttended,
          payment: entry.payment !== undefined ? entry.payment : existingEntry.payment,
          paymentType: entry.paymentType || existingEntry.paymentType || 'invoice',
          invoiceCode: invoiceCode.replace(/\s+/g, ''),
          notes: entry.notes !== undefined ? entry.notes?.trim() : existingEntry.notes,
          cashOwed: newCashOwed,
          cashOwedPaidDate: entry.cashOwedPaidDate !== undefined ? entry.cashOwedPaidDate : existingEntry.cashOwedPaidDate,
          cashOwedPaidBy: entry.cashOwedPaidBy !== undefined ? entry.cashOwedPaidBy : existingEntry.cashOwedPaidBy,
        }

        await container.item(existingEntry.id, existingEntry.date).replace(updatedEntry)
        results.push(updatedEntry)
        updated++
      } else {
        // Create new entry
        const attendanceStatus: AttendanceStatus = (entry.attendanceStatus as AttendanceStatus) || (entry.attended !== false ? 'present' : 'absent')
        const attended = attendanceStatus === 'present' || attendanceStatus === 'late-cancellation'
        
        const newEntry: RegisterEntry = {
          id: uuidv4(),
          clientId: entry.clientId,
          clientName: entry.clientName,
          date: entry.date,
          attendanceStatus,
          attended, // Legacy field - derived from attendanceStatus
          payment: entry.payment || 40,
          paymentType: entry.paymentType || 'invoice',
          invoiceCode: invoiceCode.replace(/\s+/g, ''),
          notes: entry.notes?.trim(),
          cashOwed: entry.cashOwed,
          cashOwedPaidDate: entry.cashOwedPaidDate,
          cashOwedPaidBy: entry.cashOwedPaidBy,
          createdAt: now,
          createdBy: auth.userId,
        }

        await container.items.create(newEntry)
        results.push(newEntry)
        // Add to map in case there are duplicates in the same request
        existingByClientId.set(entry.clientId, newEntry)
        created++
      }
    }

    context.info(`Bulk register: ${created} created, ${updated} updated`)
    return createdResponse(results, `${created} created, ${updated} updated`)
  } catch (error) {
    context.error('Failed to process bulk register entries:', error)
    return serverErrorResponse('Failed to process register entries')
  }
}

// PUT /api/register/{id} - Update a register entry
export async function updateRegisterEntry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const entryId = request.params.id
  context.info(`PUT /api/register/${entryId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<RegisterEntry>
    const container = getContainer(CONTAINERS.REGISTER)

    // Query to find existing entry - partition key is date, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: entryId }]
      })
      .fetchAll()
    
    if (resources.length === 0) {
      return notFoundResponse('Register entry not found')
    }

    const existing = resources[0] as RegisterEntry

    // Handle cashOwed: 0 or null means clear it, undefined means keep existing
    const newCashOwed = body.cashOwed !== undefined 
      ? (body.cashOwed === 0 || body.cashOwed === null ? undefined : body.cashOwed) 
      : existing.cashOwed

    // Determine attendance status - use new field if provided, otherwise derive from attended boolean
    let newAttendanceStatus: AttendanceStatus | undefined = body.attendanceStatus as AttendanceStatus | undefined
    let newAttended: boolean
    
    if (body.attendanceStatus !== undefined) {
      newAttendanceStatus = body.attendanceStatus as AttendanceStatus
      newAttended = newAttendanceStatus === 'present' || newAttendanceStatus === 'late-cancellation'
    } else if (body.attended !== undefined) {
      newAttended = body.attended
      newAttendanceStatus = existing.attendanceStatus || (body.attended ? 'present' : 'absent')
    } else {
      newAttended = existing.attended
      newAttendanceStatus = existing.attendanceStatus
    }

    // Update fields
    const updated: RegisterEntry = {
      ...existing,
      attendanceStatus: newAttendanceStatus,
      attended: newAttended,
      payment: body.payment !== undefined ? body.payment : existing.payment,
      paymentType: body.paymentType !== undefined ? body.paymentType : (existing.paymentType || 'invoice'),
      notes: body.notes !== undefined ? body.notes?.trim() : existing.notes,
      // Cash owed tracking
      cashOwed: newCashOwed,
      cashOwedPaidDate: body.cashOwedPaidDate !== undefined ? body.cashOwedPaidDate : existing.cashOwedPaidDate,
      cashOwedPaidBy: body.cashOwedPaidBy !== undefined ? body.cashOwedPaidBy : existing.cashOwedPaidBy,
    }

    // Use date as partition key (as defined in CosmosDB container)
    await container.item(entryId, existing.date).replace(updated)

    context.info(`Register entry ${entryId} updated (status: ${updated.attendanceStatus})`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update register entry:', error)
    return serverErrorResponse('Failed to update register entry')
  }
}

// DELETE /api/register/{id} - Delete a register entry
export async function deleteRegisterEntry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const entryId = request.params.id
  context.info(`DELETE /api/register/${entryId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.REGISTER)

    // Query to find existing entry - partition key is date, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: entryId }]
      })
      .fetchAll()
    
    if (resources.length === 0) {
      return notFoundResponse('Register entry not found')
    }

    const existing = resources[0] as RegisterEntry

    // Delete the entry using date as partition key
    await container.item(entryId, existing.date).delete()

    context.info(`Register entry ${entryId} deleted`)
    return successResponse({ message: 'Register entry deleted successfully' })
  } catch (error) {
    context.error('Failed to delete register entry:', error)
    return serverErrorResponse('Failed to delete register entry')
  }
}

// Register routes
app.http('register-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'register',
  handler: getRegister,
})

app.http('register-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'register',
  handler: createRegisterEntry,
})

app.http('register-bulk', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'register/bulk',
  handler: createBulkRegisterEntries,
})

app.http('register-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'register/{id}',
  handler: updateRegisterEntry,
})

app.http('register-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'register/{id}',
  handler: deleteRegisterEntry,
})


