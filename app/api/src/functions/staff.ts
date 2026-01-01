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

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface StaffMember {
  id: string
  userId?: string
  firstName: string
  lastName: string
  concatName: string
  email: string
  phoneNumber?: string
  dayRate: number
  workingDays?: DayOfWeek[]
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// GET /api/staff - List all staff members (all authenticated users)
export async function getStaff(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/staff')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  // All authenticated staff can see all staff members (needed for check-in)
  try {
    const container = getContainer(CONTAINERS.STAFF)
    const query = 'SELECT * FROM c ORDER BY c.concatName'
    const { resources } = await container.items.query(query).fetchAll()

    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch staff:', error)
    return serverErrorResponse('Failed to fetch staff')
  }
}

// GET /api/staff/{id} - Get single staff member
export async function getStaffById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const staffId = request.params.id
  context.info(`GET /api/staff/${staffId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.STAFF)
    const { resource } = await container.item(staffId, staffId).read<StaffMember>()

    if (!resource) {
      return notFoundResponse('Staff member not found')
    }

    // Non-admins can only view their own record
    if (!requireAdmin(auth) && resource.userId !== auth.userId) {
      return forbiddenResponse('You can only view your own staff record')
    }

    return successResponse(resource)
  } catch (error) {
    context.error('Failed to fetch staff member:', error)
    return serverErrorResponse('Failed to fetch staff member')
  }
}

// POST /api/staff - Create new staff member (admin only)
export async function createStaff(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/staff')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can create staff members')
  }

  try {
    const body = await request.json() as Partial<StaffMember>

    if (!body.firstName || !body.lastName || !body.email) {
      return badRequestResponse('First name, last name, and email are required')
    }

    if (!body.dayRate || body.dayRate <= 0) {
      return badRequestResponse('A valid day rate is required')
    }

    const now = new Date().toISOString()
    const staff: StaffMember = {
      id: uuidv4(),
      userId: body.userId?.trim(),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      concatName: `${body.firstName.trim()} ${body.lastName.trim()}`,
      email: body.email.toLowerCase().trim(),
      phoneNumber: body.phoneNumber?.trim(),
      dayRate: body.dayRate,
      workingDays: body.workingDays || [],
      notes: body.notes?.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    const container = getContainer(CONTAINERS.STAFF)
    await container.items.create(staff)

    context.info(`Staff member ${staff.concatName} created`)
    return createdResponse(staff)
  } catch (error) {
    context.error('Failed to create staff member:', error)
    return serverErrorResponse('Failed to create staff member')
  }
}

// PUT /api/staff/{id} - Update staff member (admin only)
export async function updateStaff(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const staffId = request.params.id
  context.info(`PUT /api/staff/${staffId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can update staff members')
  }

  try {
    const body = await request.json() as Partial<StaffMember>
    const container = getContainer(CONTAINERS.STAFF)

    const { resource: existing } = await container.item(staffId, staffId).read<StaffMember>()
    if (!existing) {
      return notFoundResponse('Staff member not found')
    }

    const updated: StaffMember = {
      ...existing,
      userId: body.userId !== undefined ? body.userId?.trim() : existing.userId,
      firstName: body.firstName?.trim() || existing.firstName,
      lastName: body.lastName?.trim() || existing.lastName,
      concatName: body.firstName || body.lastName
        ? `${(body.firstName?.trim() || existing.firstName)} ${(body.lastName?.trim() || existing.lastName)}`
        : existing.concatName,
      email: body.email?.toLowerCase().trim() || existing.email,
      phoneNumber: body.phoneNumber !== undefined ? body.phoneNumber?.trim() : existing.phoneNumber,
      dayRate: body.dayRate !== undefined ? body.dayRate : existing.dayRate,
      workingDays: body.workingDays !== undefined ? body.workingDays : existing.workingDays,
      notes: body.notes !== undefined ? body.notes?.trim() : existing.notes,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      updatedAt: new Date().toISOString(),
    }

    await container.item(staffId, staffId).replace(updated)

    context.info(`Staff member ${updated.concatName} updated`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update staff member:', error)
    return serverErrorResponse('Failed to update staff member')
  }
}

// DELETE /api/staff/{id} - Soft delete staff member (admin only)
export async function deleteStaff(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const staffId = request.params.id
  context.info(`DELETE /api/staff/${staffId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can delete staff members')
  }

  try {
    const container = getContainer(CONTAINERS.STAFF)
    const { resource: existing } = await container.item(staffId, staffId).read<StaffMember>()

    if (!existing) {
      return notFoundResponse('Staff member not found')
    }

    // Soft delete - mark as inactive
    const updated: StaffMember = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
    }

    await container.item(staffId, staffId).replace(updated)

    context.info(`Staff member ${existing.concatName} deleted (soft)`)
    return successResponse({ message: 'Staff member deleted successfully' })
  } catch (error) {
    context.error('Failed to delete staff member:', error)
    return serverErrorResponse('Failed to delete staff member')
  }
}

// GET /api/staff/by-user/{userId} - Get staff member by user ID (for self-identification)
export async function getStaffByUserId(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = request.params.userId
  context.info(`GET /api/staff/by-user/${userId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  // Only allow users to look up their own staff record (or admin)
  if (!requireAdmin(auth) && auth.userId !== userId) {
    return forbiddenResponse('You can only look up your own staff record')
  }

  try {
    const container = getContainer(CONTAINERS.STAFF)
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('No staff record linked to this user')
    }

    return successResponse(resources[0])
  } catch (error) {
    context.error('Failed to fetch staff by user ID:', error)
    return serverErrorResponse('Failed to fetch staff member')
  }
}

// Register routes
app.http('staff-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'staff',
  handler: getStaff,
})

app.http('staff-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'staff',
  handler: createStaff,
})

app.http('staff-get-by-id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'staff/{id}',
  handler: getStaffById,
})

app.http('staff-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'staff/{id}',
  handler: updateStaff,
})

app.http('staff-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'staff/{id}',
  handler: deleteStaff,
})

app.http('staff-by-user', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'staff/by-user/{userId}',
  handler: getStaffByUserId,
})

