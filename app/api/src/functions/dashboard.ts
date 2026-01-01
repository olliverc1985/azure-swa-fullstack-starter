import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest, requireAdmin } from '../shared/auth'
import { successResponse, unauthorisedResponse, forbiddenResponse, serverErrorResponse } from '../shared/http'

interface DashboardStats {
  totalClients: number
  activeClients: number
  sessionsThisMonth: number
  revenueThisMonth: number
  unpaidInvoices: number
  unpaidAmount: number
}

export async function getDashboardStats(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/dashboard/stats')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    // Get current month date range
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

    // Get clients count
    const clientsContainer = getContainer(CONTAINERS.CLIENTS)
    let totalClients = 0
    let activeClients = 0
    
    try {
      const clientsResult = await clientsContainer.items
        .query({ query: 'SELECT c.isActive FROM c' })
        .fetchAll()
      totalClients = clientsResult.resources.length
      activeClients = clientsResult.resources.filter((c: any) => c.isActive !== false).length
    } catch (e: any) {
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        context.warn('Could not fetch clients:', e?.message)
      }
    }

    // Get register entries for this month
    // Billable sessions: present OR late-cancellation OR (legacy: attended=true with no status)
    const registerContainer = getContainer(CONTAINERS.REGISTER)
    let sessionsThisMonth = 0
    let revenueThisMonth = 0
    
    try {
      const registerResult = await registerContainer.items
        .query({
          query: `SELECT c.payment FROM c 
                  WHERE c.date >= @start AND c.date <= @end 
                  AND (
                    c.attendanceStatus IN ('present', 'late-cancellation')
                    OR (c.attended = true AND NOT IS_DEFINED(c.attendanceStatus))
                  )`,
          parameters: [
            { name: '@start', value: monthStart },
            { name: '@end', value: monthEnd }
          ]
        })
        .fetchAll()
      sessionsThisMonth = registerResult.resources.length
      revenueThisMonth = registerResult.resources.reduce((sum: number, r: any) => sum + (r.payment || 0), 0)
    } catch (e: any) {
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        context.warn('Could not fetch register:', e?.message)
      }
    }

    // Get unpaid invoices (admin only)
    let unpaidInvoices = 0
    let unpaidAmount = 0
    
    if (requireAdmin(auth)) {
      try {
        const invoicesContainer = getContainer(CONTAINERS.INVOICES)
        const invoicesResult = await invoicesContainer.items
          .query({
            query: "SELECT c.total FROM c WHERE c.status IN ('sent', 'overdue')"
          })
          .fetchAll()
        unpaidInvoices = invoicesResult.resources.length
        unpaidAmount = invoicesResult.resources.reduce((sum: number, i: any) => sum + (i.total || 0), 0)
      } catch (e: any) {
        if (e?.code !== 404 && e?.code !== 'NotFound') {
          context.warn('Could not fetch invoices:', e?.message)
        }
      }
    }

    const stats: DashboardStats = {
      totalClients,
      activeClients,
      sessionsThisMonth,
      revenueThisMonth,
      unpaidInvoices,
      unpaidAmount,
    }

    return successResponse(stats)
  } catch (error) {
    context.error('Failed to fetch dashboard stats:', error)
    return serverErrorResponse('Failed to fetch dashboard stats')
  }
}

app.http('dashboard-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/stats',
  handler: getDashboardStats,
})

// Invoice status breakdown for dashboard
interface InvoiceStatusBreakdown {
  draft: number
  sent: number
  paid: number
  overdue: number
  cancelled: number
  totalOutstanding: number
}

export async function getInvoiceStatusBreakdown(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/dashboard/invoice-status')

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Admin access required') : unauthorisedResponse()
  }

  try {
    const invoicesContainer = getContainer(CONTAINERS.INVOICES)
    
    let invoices: Array<{ status: string; total: number }> = []
    
    try {
      const result = await invoicesContainer.items
        .query({ query: 'SELECT c.status, c.total FROM c' })
        .fetchAll()
      invoices = result.resources
    } catch (e: any) {
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        context.warn('Could not fetch invoices:', e?.message)
      }
    }

    // Count by status
    const breakdown: InvoiceStatusBreakdown = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
      totalOutstanding: 0,
    }

    for (const invoice of invoices) {
      const status = invoice.status as keyof Omit<InvoiceStatusBreakdown, 'totalOutstanding'>
      if (status in breakdown) {
        breakdown[status]++
      }
      // Calculate outstanding amount (sent + overdue)
      if (invoice.status === 'sent' || invoice.status === 'overdue') {
        breakdown.totalOutstanding += invoice.total || 0
      }
    }

    return successResponse(breakdown)
  } catch (error) {
    context.error('Failed to fetch invoice status breakdown:', error)
    return serverErrorResponse('Failed to fetch invoice status breakdown')
  }
}

app.http('dashboard-invoice-status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/invoice-status',
  handler: getInvoiceStatusBreakdown,
})

