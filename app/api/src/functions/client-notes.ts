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

type ClientNoteType = 
  | 'general'
  | 'requirements'
  | 'preferences'
  | 'billing'
  | 'feedback'
  | 'follow_up'
  | 'other'

interface ClientNote {
  id: string
  clientId: string
  noteType: ClientNoteType
  title: string
  content: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// GET /api/client-notes - List all notes for a client
export async function getClientNotes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/client-notes')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const clientId = request.query.get('clientId')
    const noteType = request.query.get('noteType')
    const container = getContainer(CONTAINERS.CLIENT_NOTES)
    
    let query = 'SELECT * FROM c WHERE c.isActive = true'
    const parameters: { name: string; value: string }[] = []

    if (clientId) {
      query += ' AND c.clientId = @clientId'
      parameters.push({ name: '@clientId', value: clientId })
    }

    if (noteType) {
      query += ' AND c.noteType = @noteType'
      parameters.push({ name: '@noteType', value: noteType })
    }

    query += ' ORDER BY c.noteType, c.updatedAt DESC'

    const { resources } = await container.items.query({ query, parameters }).fetchAll()

    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch client notes:', error)
    return serverErrorResponse('Failed to fetch client notes')
  }
}

// POST /api/client-notes - Create a new note
export async function createClientNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/client-notes')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<ClientNote>

    if (!body.clientId || !body.noteType || !body.content) {
      return badRequestResponse('Client ID, note type, and content are required')
    }

    const now = new Date().toISOString()
    const note: ClientNote = {
      id: uuidv4(),
      clientId: body.clientId,
      noteType: body.noteType,
      title: body.title || getNoteTypeLabel(body.noteType),
      content: body.content.trim(),
      createdBy: auth.userId,
      createdByName: body.createdByName || 'Unknown',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    }

    const container = getContainer(CONTAINERS.CLIENT_NOTES)
    await container.items.create(note)

    context.info(`Client note created: ${note.title} for client ${note.clientId}`)
    return createdResponse(note)
  } catch (error) {
    context.error('Failed to create client note:', error)
    return serverErrorResponse('Failed to create client note')
  }
}

// GET /api/client-notes/{id} - Get a single note
export async function getClientNoteById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const noteId = request.params.id
  context.info(`GET /api/client-notes/${noteId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.CLIENT_NOTES)
    // Query to find note - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.isActive = true',
        parameters: [{ name: '@id', value: noteId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Client note not found')
    }

    return successResponse(resources[0])
  } catch (error) {
    context.error('Failed to fetch client note:', error)
    return serverErrorResponse('Failed to fetch client note')
  }
}

// PUT /api/client-notes/{id} - Update a note
export async function updateClientNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const noteId = request.params.id
  context.info(`PUT /api/client-notes/${noteId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<ClientNote>
    const container = getContainer(CONTAINERS.CLIENT_NOTES)

    // Query to find existing note - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id AND c.isActive = true',
        parameters: [{ name: '@id', value: noteId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Client note not found')
    }

    const existing = resources[0] as ClientNote

    // Update fields
    const updated: ClientNote = {
      ...existing,
      noteType: body.noteType || existing.noteType,
      title: body.title !== undefined ? body.title : existing.title,
      content: body.content !== undefined ? body.content.trim() : existing.content,
      updatedAt: new Date().toISOString(),
    }

    // Use clientId as partition key
    await container.item(noteId, existing.clientId).replace(updated)

    context.info(`Client note ${noteId} updated`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update client note:', error)
    return serverErrorResponse('Failed to update client note')
  }
}

// DELETE /api/client-notes/{id} - Soft delete a note
export async function deleteClientNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const noteId = request.params.id
  context.info(`DELETE /api/client-notes/${noteId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.CLIENT_NOTES)

    // Query to find existing note - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: noteId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Client note not found')
    }

    const existing = resources[0] as ClientNote

    // Soft delete
    const updated: ClientNote = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
    }

    // Use clientId as partition key
    await container.item(noteId, existing.clientId).replace(updated)

    context.info(`Client note ${noteId} deleted (soft)`)
    return successResponse({ message: 'Client note deleted successfully' })
  } catch (error) {
    context.error('Failed to delete client note:', error)
    return serverErrorResponse('Failed to delete client note')
  }
}

// Helper function to get note type labels
function getNoteTypeLabel(noteType: ClientNoteType): string {
  const labels: Record<ClientNoteType, string> = {
    general: 'General Notes',
    requirements: 'Special Requirements',
    preferences: 'Preferences',
    billing: 'Billing Information',
    feedback: 'Feedback',
    follow_up: 'Follow-up Actions',
    other: 'Other Notes',
  }
  return labels[noteType] || 'Note'
}

// Register routes
app.http('client-notes-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'client-notes',
  handler: getClientNotes,
})

app.http('client-notes-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'client-notes',
  handler: createClientNote,
})

app.http('client-notes-get-by-id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'client-notes/{id}',
  handler: getClientNoteById,
})

app.http('client-notes-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'client-notes/{id}',
  handler: updateClientNote,
})

app.http('client-notes-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'client-notes/{id}',
  handler: deleteClientNote,
})



