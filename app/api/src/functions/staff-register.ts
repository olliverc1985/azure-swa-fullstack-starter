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

interface StaffMember {
  id: string
  userId?: string
  firstName: string
  lastName: string
  concatName: string
  dayRate: number
  isActive: boolean
}

interface StaffRegisterEntry {
  id: string
  staffId: string
  staffName: string
  date: string
  dayRate: number
  notes?: string
  createdAt: string
  createdBy: string
}

// GET /api/staff-register - Get staff register entries by date or month
export async function getStaffRegister(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/staff-register')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const date = request.query.get('date')
    const year = request.query.get('year')
    const month = request.query.get('month')

    const container = getContainer(CONTAINERS.STAFF_REGISTER)
    let query: string
    let parameters: { name: string; value: string | number }[] = []

    if (date) {
      query = 'SELECT * FROM c WHERE c.date = @date ORDER BY c.staffName'
      parameters = [{ name: '@date', value: date }]
    } else if (year && month) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const endDate = `${year}-${month.padStart(2, '0')}-31`
      query = 'SELECT * FROM c WHERE c.date >= @startDate AND c.date <= @endDate ORDER BY c.date, c.staffName'
      parameters = [
        { name: '@startDate', value: startDate },
        { name: '@endDate', value: endDate },
      ]
    } else {
      // Default: last 30 days
      const today = new Date()
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
      query = 'SELECT * FROM c WHERE c.date >= @startDate ORDER BY c.date DESC, c.staffName'
      parameters = [{ name: '@startDate', value: thirtyDaysAgo }]
    }

    const { resources } = await container.items.query({ query, parameters }).fetchAll()

    // All authenticated staff can see all entries
    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch staff register:', error)
    return serverErrorResponse('Failed to fetch staff register')
  }
}

// POST /api/staff-register - Create staff register entry
export async function createStaffRegisterEntry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/staff-register')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<StaffRegisterEntry>

    if (!body.staffId || !body.date) {
      return badRequestResponse('Staff ID and date are required')
    }

    // Get the staff member to validate and get their details
    const staffContainer = getContainer(CONTAINERS.STAFF)
    const { resource: staffMember } = await staffContainer.item(body.staffId, body.staffId).read<StaffMember>()

    if (!staffMember) {
      return notFoundResponse('Staff member not found')
    }

    // All authenticated staff can check in any staff member

    // Check for existing entry on this date
    const registerContainer = getContainer(CONTAINERS.STAFF_REGISTER)
    const { resources: existingEntries } = await registerContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.staffId = @staffId AND c.date = @date',
        parameters: [
          { name: '@staffId', value: body.staffId },
          { name: '@date', value: body.date },
        ],
      })
      .fetchAll()

    if (existingEntries.length > 0) {
      return badRequestResponse('An entry already exists for this staff member on this date')
    }

    const now = new Date().toISOString()
    const entry: StaffRegisterEntry = {
      id: uuidv4(),
      staffId: body.staffId,
      staffName: staffMember.concatName,
      date: body.date,
      dayRate: staffMember.dayRate, // Use current rate for historical accuracy
      notes: body.notes?.trim(),
      createdAt: now,
      createdBy: auth.userId,
    }

    await registerContainer.items.create(entry)

    context.info(`Staff register entry created for ${entry.staffName} on ${entry.date}`)
    return createdResponse(entry)
  } catch (error) {
    context.error('Failed to create staff register entry:', error)
    return serverErrorResponse('Failed to create staff register entry')
  }
}

// POST /api/staff-register/bulk - Create multiple staff register entries (admin only)
export async function createBulkStaffRegisterEntries(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/staff-register/bulk')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can create bulk entries')
  }

  try {
    const body = await request.json() as { entries: Partial<StaffRegisterEntry>[] }

    if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
      return badRequestResponse('Entries array is required')
    }

    const staffContainer = getContainer(CONTAINERS.STAFF)
    const registerContainer = getContainer(CONTAINERS.STAFF_REGISTER)
    const now = new Date().toISOString()
    const created: StaffRegisterEntry[] = []

    for (const entryData of body.entries) {
      if (!entryData.staffId || !entryData.date) {
        continue // Skip invalid entries
      }

      // Get staff member details
      const { resource: staffMember } = await staffContainer.item(entryData.staffId, entryData.staffId).read<StaffMember>()
      if (!staffMember) {
        continue // Skip if staff not found
      }

      // Check for existing entry
      const { resources: existingEntries } = await registerContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.staffId = @staffId AND c.date = @date',
          parameters: [
            { name: '@staffId', value: entryData.staffId },
            { name: '@date', value: entryData.date },
          ],
        })
        .fetchAll()

      if (existingEntries.length > 0) {
        continue // Skip duplicates
      }

      const entry: StaffRegisterEntry = {
        id: uuidv4(),
        staffId: entryData.staffId,
        staffName: staffMember.concatName,
        date: entryData.date,
        dayRate: staffMember.dayRate,
        notes: entryData.notes?.trim(),
        createdAt: now,
        createdBy: auth.userId,
      }

      await registerContainer.items.create(entry)
      created.push(entry)
    }

    context.info(`Created ${created.length} staff register entries`)
    return createdResponse(created)
  } catch (error) {
    context.error('Failed to create bulk staff register entries:', error)
    return serverErrorResponse('Failed to create staff register entries')
  }
}

// PUT /api/staff-register/{id} - Update a staff register entry
// All authenticated staff can update entries (to fix mistakes)
export async function updateStaffRegisterEntry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const entryId = request.params.id
  context.info(`PUT /api/staff-register/${entryId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<StaffRegisterEntry>
    const container = getContainer(CONTAINERS.STAFF_REGISTER)

    // Query to find existing entry
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: entryId }],
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Staff register entry not found')
    }

    const existing = resources[0] as StaffRegisterEntry

    const updated: StaffRegisterEntry = {
      ...existing,
      notes: body.notes !== undefined ? body.notes?.trim() : existing.notes,
    }

    // Use date as partition key
    await container.item(entryId, existing.date).replace(updated)

    context.info(`Staff register entry ${entryId} updated by ${auth.email}`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update staff register entry:', error)
    return serverErrorResponse('Failed to update staff register entry')
  }
}

// DELETE /api/staff-register/{id} - Delete a staff register entry
// All authenticated staff can delete entries (to fix mistakes like checking in wrong person)
export async function deleteStaffRegisterEntry(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const entryId = request.params.id
  context.info(`DELETE /api/staff-register/${entryId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.STAFF_REGISTER)

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: entryId }],
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Staff register entry not found')
    }

    const existing = resources[0] as StaffRegisterEntry
    await container.item(entryId, existing.date).delete()

    context.info(`Staff register entry ${entryId} deleted by ${auth.email}`)
    return successResponse({ message: 'Staff register entry deleted successfully' })
  } catch (error) {
    context.error('Failed to delete staff register entry:', error)
    return serverErrorResponse('Failed to delete staff register entry')
  }
}

// Register routes
app.http('staff-register-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'staff-register',
  handler: getStaffRegister,
})

app.http('staff-register-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'staff-register',
  handler: createStaffRegisterEntry,
})

app.http('staff-register-bulk', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'staff-register/bulk',
  handler: createBulkStaffRegisterEntries,
})

app.http('staff-register-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'staff-register/{id}',
  handler: updateStaffRegisterEntry,
})

app.http('staff-register-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'staff-register/{id}',
  handler: deleteStaffRegisterEntry,
})

