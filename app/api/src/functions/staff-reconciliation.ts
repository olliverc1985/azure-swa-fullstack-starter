import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest, requireAdmin } from '../shared/auth'
import {
  successResponse,
  badRequestResponse,
  unauthorisedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '../shared/http'

interface StaffMember {
  id: string
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

interface StaffReconciliation {
  staffId: string
  staffName: string
  dayRate: number
  daysWorked: number
  totalAmount: number
  entries: StaffRegisterEntry[]
}

// GET /api/staff-reconciliation - Get monthly reconciliation report (admin only)
export async function getStaffReconciliation(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/staff-reconciliation')

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Only administrators can view staff reconciliation') : unauthorisedResponse()
  }

  const year = request.query.get('year')
  const month = request.query.get('month')

  if (!year || !month) {
    return badRequestResponse('Year and month are required')
  }

  try {
    const startDate = `${year}-${month.padStart(2, '0')}-01`
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    // Get all staff register entries for the month (no ORDER BY - sorted in app code)
    let entries: StaffRegisterEntry[] = []
    try {
      const registerContainer = getContainer(CONTAINERS.STAFF_REGISTER)
      const result = await registerContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.date >= @startDate AND c.date <= @endDate',
          parameters: [
            { name: '@startDate', value: startDate },
            { name: '@endDate', value: endDate },
          ],
        })
        .fetchAll()
      entries = result.resources as StaffRegisterEntry[]
    } catch (e: any) {
      // If container doesn't exist yet, continue with empty entries
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        context.warn('Could not fetch staff register entries:', e?.message)
      }
    }

    // Get all active staff members for reference (no ORDER BY - sorted in app code)
    let allStaff: StaffMember[] = []
    try {
      const staffContainer = getContainer(CONTAINERS.STAFF)
      const result = await staffContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.isActive = true' })
        .fetchAll()
      allStaff = result.resources as StaffMember[]
    } catch (e: any) {
      // If container doesn't exist yet, continue with empty staff
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        context.warn('Could not fetch staff members:', e?.message)
      }
    }

    // Group entries by staff member
    const staffMap = new Map<string, StaffReconciliation>()

    // Initialise with all active staff (even if no entries)
    for (const staff of allStaff) {
      staffMap.set(staff.id, {
        staffId: staff.id,
        staffName: staff.concatName,
        dayRate: staff.dayRate,
        daysWorked: 0,
        totalAmount: 0,
        entries: [],
      })
    }

    // Populate with entries
    for (const entry of entries) {
      let reconciliation = staffMap.get(entry.staffId)
      
      if (!reconciliation) {
        // Staff member might have been deactivated - create entry from register data
        reconciliation = {
          staffId: entry.staffId,
          staffName: entry.staffName,
          dayRate: entry.dayRate,
          daysWorked: 0,
          totalAmount: 0,
          entries: [],
        }
        staffMap.set(entry.staffId, reconciliation)
      }

      reconciliation.daysWorked++
      reconciliation.totalAmount += entry.dayRate
      reconciliation.entries.push(entry)
    }

    // Convert to array and filter out staff with no entries
    const reconciliations = Array.from(staffMap.values())
      .filter(r => r.daysWorked > 0)
      .sort((a, b) => a.staffName.localeCompare(b.staffName))

    return successResponse(reconciliations)
  } catch (error: any) {
    // If container doesn't exist yet, return empty array
    if (error?.code === 404 || error?.code === 'NotFound') {
      return successResponse([])
    }
    context.error('Failed to fetch staff reconciliation:', error)
    return serverErrorResponse('Failed to fetch staff reconciliation')
  }
}

// Register routes
app.http('staff-reconciliation-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'staff-reconciliation',
  handler: getStaffReconciliation,
})

