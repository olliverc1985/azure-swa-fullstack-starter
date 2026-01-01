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

type IncidentSeverity = 'low' | 'medium' | 'high'
type IncidentStatus = 'open' | 'resolved'

interface IncidentReport {
  id: string
  clientId: string
  clientName: string
  date: string // ISO date string YYYY-MM-DD
  time: string // HH:mm format
  description: string
  actionTaken: string
  reportedBy: string // User ID
  reportedByName: string
  witnesses?: string[]
  severity: IncidentSeverity
  followUpRequired: boolean
  followUpNotes?: string
  status: IncidentStatus
  createdAt: string
  updatedAt: string
}

// GET /api/incidents - List all incidents (optionally filtered by clientId)
export async function getIncidents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/incidents')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const clientId = request.query.get('clientId')
    const status = request.query.get('status')
    const container = getContainer(CONTAINERS.INCIDENTS)
    
    let query = 'SELECT * FROM c'
    const conditions: string[] = []
    const parameters: { name: string; value: string }[] = []

    if (clientId) {
      conditions.push('c.clientId = @clientId')
      parameters.push({ name: '@clientId', value: clientId })
    }

    if (status) {
      conditions.push('c.status = @status')
      parameters.push({ name: '@status', value: status })
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY c.date DESC, c.time DESC'

    const { resources } = await container.items.query({ query, parameters }).fetchAll()

    return successResponse(resources)
  } catch (error) {
    context.error('Failed to fetch incidents:', error)
    return serverErrorResponse('Failed to fetch incidents')
  }
}

// POST /api/incidents - Create a new incident report
export async function createIncident(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('POST /api/incidents')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<IncidentReport>

    if (!body.clientId || !body.clientName || !body.date || !body.description) {
      return badRequestResponse('Client ID, client name, date, and description are required')
    }

    const now = new Date().toISOString()
    const incident: IncidentReport = {
      id: uuidv4(),
      clientId: body.clientId,
      clientName: body.clientName,
      date: body.date,
      time: body.time || new Date().toTimeString().slice(0, 5),
      description: body.description.trim(),
      actionTaken: body.actionTaken?.trim() || '',
      reportedBy: auth.userId,
      reportedByName: body.reportedByName || 'Unknown',
      witnesses: body.witnesses?.filter(w => w.trim()) || [],
      severity: body.severity || 'low',
      followUpRequired: body.followUpRequired || false,
      followUpNotes: body.followUpNotes?.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }

    const container = getContainer(CONTAINERS.INCIDENTS)
    await container.items.create(incident)

    context.info(`Incident report created for ${incident.clientName} on ${incident.date}`)
    return createdResponse(incident)
  } catch (error) {
    context.error('Failed to create incident:', error)
    return serverErrorResponse('Failed to create incident report')
  }
}

// GET /api/incidents/{id} - Get a single incident
export async function getIncidentById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const incidentId = request.params.id
  context.info(`GET /api/incidents/${incidentId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.INCIDENTS)
    // Query to find incident - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: incidentId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Incident not found')
    }

    return successResponse(resources[0])
  } catch (error) {
    context.error('Failed to fetch incident:', error)
    return serverErrorResponse('Failed to fetch incident')
  }
}

// PUT /api/incidents/{id} - Update an incident report
export async function updateIncident(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const incidentId = request.params.id
  context.info(`PUT /api/incidents/${incidentId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<IncidentReport>
    const container = getContainer(CONTAINERS.INCIDENTS)

    // Query to find existing incident - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: incidentId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Incident not found')
    }

    const existing = resources[0] as IncidentReport

    // Update fields
    const updated: IncidentReport = {
      ...existing,
      date: body.date || existing.date,
      time: body.time || existing.time,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      actionTaken: body.actionTaken !== undefined ? body.actionTaken.trim() : existing.actionTaken,
      witnesses: body.witnesses !== undefined ? body.witnesses.filter(w => w.trim()) : existing.witnesses,
      severity: body.severity || existing.severity,
      followUpRequired: body.followUpRequired !== undefined ? body.followUpRequired : existing.followUpRequired,
      followUpNotes: body.followUpNotes !== undefined ? body.followUpNotes.trim() : existing.followUpNotes,
      status: body.status || existing.status,
      updatedAt: new Date().toISOString(),
    }

    // Use clientId as partition key
    await container.item(incidentId, existing.clientId).replace(updated)

    context.info(`Incident ${incidentId} updated`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update incident:', error)
    return serverErrorResponse('Failed to update incident')
  }
}

// DELETE /api/incidents/{id} - Delete an incident report
export async function deleteIncident(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const incidentId = request.params.id
  context.info(`DELETE /api/incidents/${incidentId}`)

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.INCIDENTS)

    // Query to find existing incident - partition key is clientId, not id
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: incidentId }]
      })
      .fetchAll()

    if (resources.length === 0) {
      return notFoundResponse('Incident not found')
    }

    const existing = resources[0] as IncidentReport

    // Hard delete for incidents - use clientId as partition key
    await container.item(incidentId, existing.clientId).delete()

    context.info(`Incident ${incidentId} deleted`)
    return successResponse({ message: 'Incident deleted successfully' })
  } catch (error) {
    context.error('Failed to delete incident:', error)
    return serverErrorResponse('Failed to delete incident')
  }
}

// Register routes
app.http('incidents-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'incidents',
  handler: getIncidents,
})

app.http('incidents-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'incidents',
  handler: createIncident,
})

app.http('incidents-get-by-id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'incidents/{id}',
  handler: getIncidentById,
})

app.http('incidents-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'incidents/{id}',
  handler: updateIncident,
})

app.http('incidents-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'incidents/{id}',
  handler: deleteIncident,
})



