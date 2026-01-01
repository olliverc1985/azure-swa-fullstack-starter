import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { v4 as uuidv4 } from 'uuid'
import { getContainer, CONTAINERS } from '../shared/database'
import { hashPassword, verifyPassword, sanitiseUser, User, authenticateRequest, requireAdmin } from '../shared/auth'
import { 
  successResponse, 
  createdResponse,
  badRequestResponse, 
  unauthorisedResponse,
  forbiddenResponse,
  serverErrorResponse 
} from '../shared/http'

interface CreateUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'admin' | 'worker'
}

// POST /api/admin/users - Create a new user (Admin only)
export async function createUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/admin/users')

  // Require admin authentication
  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can create users')
  }

  try {
    const body = await request.json() as CreateUserRequest

    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return badRequestResponse('All fields are required')
    }

    if (body.password.length < 8) {
      return badRequestResponse('Password must be at least 8 characters')
    }

    const email = body.email.toLowerCase().trim()
    const container = getContainer(CONTAINERS.USERS)

    // Check if user already exists
    const { resources: existing } = await container.items
      .query({
        query: 'SELECT c.id FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }],
      })
      .fetchAll()

    if (existing.length > 0) {
      return badRequestResponse('An account with this email already exists')
    }

    // Create user with specified role (default to worker)
    const now = new Date().toISOString()
    const user: User = {
      id: uuidv4(),
      email,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      role: body.role || 'worker',
      passwordHash: await hashPassword(body.password),
      tokenVersion: 1, // For session invalidation on password change
      createdAt: now,
      updatedAt: now,
    }

    await container.items.create(user)

    context.info(`Admin ${auth.email} created user ${user.email} as ${user.role}`)

    return createdResponse(sanitiseUser(user), 'User created successfully')
  } catch (error) {
    context.error('Create user error:', error)
    return serverErrorResponse('Failed to create user')
  }
}

// GET /api/admin/users - List all users (Admin only)
export async function listUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/admin/users')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can view users')
  }

  try {
    const container = getContainer(CONTAINERS.USERS)
    const { resources } = await container.items
      .query({ query: 'SELECT * FROM c ORDER BY c.createdAt DESC' })
      .fetchAll()

    // Sanitise all users (remove password hashes)
    const sanitisedUsers = resources.map((user: User) => sanitiseUser(user))

    return successResponse(sanitisedUsers)
  } catch (error) {
    context.error('List users error:', error)
    return serverErrorResponse('Failed to fetch users')
  }
}

// DELETE /api/admin/users/{id} - Delete a user (Admin only)
export async function deleteUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = request.params.id
  context.info(`DELETE /api/admin/users/${userId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  if (!requireAdmin(auth)) {
    return forbiddenResponse('Only administrators can delete users')
  }

  // Prevent self-deletion
  if (auth.userId === userId) {
    return badRequestResponse('You cannot delete your own account')
  }

  try {
    const container = getContainer(CONTAINERS.USERS)
    
    // Check user exists
    const { resource: existing } = await container.item(userId, userId).read<User>()
    if (!existing) {
      return badRequestResponse('User not found')
    }

    await container.item(userId, userId).delete()

    context.info(`Admin ${auth.email} deleted user ${existing.email}`)

    return successResponse({ message: 'User deleted successfully' })
  } catch (error) {
    context.error('Delete user error:', error)
    return serverErrorResponse('Failed to delete user')
  }
}

// PUT /api/auth/password - Change current user's password
export async function changePassword(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('PUT /api/auth/password')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as { currentPassword: string; newPassword: string }

    if (!body.currentPassword || !body.newPassword) {
      return badRequestResponse('Current password and new password are required')
    }

    if (body.newPassword.length < 8) {
      return badRequestResponse('New password must be at least 8 characters')
    }

    if (body.currentPassword === body.newPassword) {
      return badRequestResponse('New password must be different from current password')
    }

    const container = getContainer(CONTAINERS.USERS)

    // Query to find the user
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: auth.userId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return badRequestResponse('User not found')
    }

    const user = resources[0] as User

    // Verify current password
    const isValid = await verifyPassword(body.currentPassword, user.passwordHash)
    if (!isValid) {
      return badRequestResponse('Current password is incorrect')
    }

    // Update password and increment token version (invalidates existing tokens)
    const updated: User = {
      ...user,
      passwordHash: await hashPassword(body.newPassword),
      tokenVersion: (user.tokenVersion || 1) + 1,
      updatedAt: new Date().toISOString(),
    }

    await container.item(auth.userId, auth.userId).replace(updated)

    context.info(`User ${auth.email} changed their password`)

    return successResponse({ message: 'Password changed successfully. Please log in again.' })
  } catch (error) {
    context.error('Change password error:', error)
    return serverErrorResponse('Failed to change password')
  }
}

// Register routes
app.http('auth-change-password', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'auth/password',
  handler: changePassword,
})

app.http('admin-users-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/admin',
  handler: listUsers,
})

app.http('admin-users-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users/admin',
  handler: createUser,
})

app.http('admin-users-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'users/admin/{id}',
  handler: deleteUser,
})


