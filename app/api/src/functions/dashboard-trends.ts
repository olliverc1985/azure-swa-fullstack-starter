import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest } from '../shared/auth'
import { successResponse, unauthorisedResponse, serverErrorResponse } from '../shared/http'

interface MonthlyTrend {
  period: string // YYYY-MM
  year: number
  month: number
  monthName: string
  totalSessions: number
  totalRevenue: number
  uniqueClients: number
  averageSessionValue: number
}

interface TrendsResponse {
  monthly: MonthlyTrend[]
  summary: {
    totalRevenue: number
    totalSessions: number
    averageMonthlyRevenue: number
    averageMonthlySessions: number
    growthRate: number // % change from first to last period
  }
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * GET /api/dashboard/trends
 * Returns monthly aggregated data for trends analysis
 * Query params:
 *   - months: Number of months to look back (default: 12)
 */
export async function getDashboardTrends(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/dashboard/trends')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  try {
    // Get query params
    const monthsParam = request.query.get('months')
    const months = monthsParam ? parseInt(monthsParam, 10) : 12

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    // Query register entries for the period
    const registerContainer = getContainer(CONTAINERS.REGISTER)
    
    let entries: Array<{ date: string; payment: number; clientId: string; attended: boolean; attendanceStatus?: string }> = []
    
    try {
      // Billable sessions: present OR late-cancellation OR (legacy: attended=true with no status)
      const result = await registerContainer.items
        .query({
          query: `
            SELECT c.date, c.payment, c.clientId, c.attended, c.attendanceStatus 
            FROM c 
            WHERE c.date >= @startDate 
              AND c.date <= @endDate 
              AND (
                c.attendanceStatus IN ('present', 'late-cancellation')
                OR (c.attended = true AND NOT IS_DEFINED(c.attendanceStatus))
              )
          `,
          parameters: [
            { name: '@startDate', value: startDateStr },
            { name: '@endDate', value: endDateStr }
          ]
        })
        .fetchAll()
      entries = result.resources
    } catch (e: any) {
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        context.warn('Could not fetch register entries:', e?.message)
      }
    }

    // Aggregate by month
    const monthlyMap = new Map<string, {
      sessions: number
      revenue: number
      clients: Set<string>
    }>()

    // Initialise all months in range (even if no data)
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(period, { sessions: 0, revenue: 0, clients: new Set() })
    }

    // Populate with actual data
    for (const entry of entries) {
      const period = entry.date.substring(0, 7) // YYYY-MM
      const monthData = monthlyMap.get(period)
      
      if (monthData) {
        monthData.sessions += 1
        monthData.revenue += entry.payment || 0
        monthData.clients.add(entry.clientId)
      }
    }

    // Convert to response format
    const monthly: MonthlyTrend[] = []
    let totalRevenue = 0
    let totalSessions = 0

    for (const [period, data] of monthlyMap.entries()) {
      const [yearStr, monthStr] = period.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)

      monthly.push({
        period,
        year,
        month,
        monthName: monthNames[month - 1],
        totalSessions: data.sessions,
        totalRevenue: data.revenue,
        uniqueClients: data.clients.size,
        averageSessionValue: data.sessions > 0 ? data.revenue / data.sessions : 0,
      })

      totalRevenue += data.revenue
      totalSessions += data.sessions
    }

    // Sort by period
    monthly.sort((a, b) => a.period.localeCompare(b.period))

    // Calculate growth rate (first month vs last month with data)
    const firstMonthWithData = monthly.find(m => m.totalRevenue > 0)
    const lastMonthWithData = [...monthly].reverse().find(m => m.totalRevenue > 0)
    
    let growthRate = 0
    if (firstMonthWithData && lastMonthWithData && firstMonthWithData.totalRevenue > 0) {
      growthRate = ((lastMonthWithData.totalRevenue - firstMonthWithData.totalRevenue) / firstMonthWithData.totalRevenue) * 100
    }

    const response: TrendsResponse = {
      monthly,
      summary: {
        totalRevenue,
        totalSessions,
        averageMonthlyRevenue: months > 0 ? totalRevenue / months : 0,
        averageMonthlySessions: months > 0 ? totalSessions / months : 0,
        growthRate,
      },
    }

    return successResponse(response)
  } catch (error) {
    context.error('Failed to fetch dashboard trends:', error)
    return serverErrorResponse('Failed to fetch dashboard trends')
  }
}

app.http('dashboard-trends', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/trends',
  handler: getDashboardTrends,
})






