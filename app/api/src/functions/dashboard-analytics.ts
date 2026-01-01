import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest, requireAdmin } from '../shared/auth'
import { successResponse, unauthorisedResponse, badRequestResponse, serverErrorResponse } from '../shared/http'

type AnalyticsType = 'revenue-by-day' | 'attendance-by-day' | 'client-activity' | 'comparison'

interface DayOfWeekData {
  day: string
  dayIndex: number
  totalSessions: number
  totalRevenue: number
  averageSessions: number
  averageRevenue: number
  weeks: number
}

interface ComparisonData {
  current: {
    period: string
    sessions: number
    revenue: number
    clients: number
  }
  previous: {
    period: string
    sessions: number
    revenue: number
    clients: number
  }
  change: {
    sessions: number
    sessionsPercent: number
    revenue: number
    revenuePercent: number
    clients: number
    clientsPercent: number
  }
  isPartialPeriod: boolean // Indicates if comparing partial periods (e.g., mid-month)
}

interface ClientActivityData {
  clientId: string
  clientName: string
  sessionCount: number
  totalSpent: number
  lastAttended: string
  daysInactive: number
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * GET /api/dashboard/analytics
 * Returns detailed analytics breakdowns
 * Query params:
 *   - type: 'revenue-by-day' | 'attendance-by-day' | 'client-activity' | 'comparison'
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - limit: number (for client-activity, default 10)
 */
export async function getDashboardAnalytics(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/dashboard/analytics')

  const auth = await authenticateRequest(request, context)
  if (!auth) {
    return unauthorisedResponse()
  }

  const analyticsType = request.query.get('type') as AnalyticsType
  if (!analyticsType) {
    return badRequestResponse('Analytics type is required')
  }

  try {
    switch (analyticsType) {
      case 'revenue-by-day':
      case 'attendance-by-day':
        return await getByDayAnalytics(request, context, analyticsType === 'revenue-by-day')
      
      case 'client-activity':
        return await getClientActivityAnalytics(request, context)
      
      case 'comparison':
        return await getComparisonAnalytics(request, context)
      
      default:
        return badRequestResponse(`Unknown analytics type: ${analyticsType}`)
    }
  } catch (error) {
    context.error('Failed to fetch analytics:', error)
    return serverErrorResponse('Failed to fetch analytics')
  }
}

async function getByDayAnalytics(
  request: HttpRequest,
  context: InvocationContext,
  includeRevenue: boolean
): Promise<HttpResponseInit> {
  const startDateParam = request.query.get('startDate')
  const endDateParam = request.query.get('endDate')

  // Default to last 3 months
  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const startDate = startDateParam || defaultStart.toISOString().split('T')[0]
  const endDate = endDateParam || now.toISOString().split('T')[0]

  const registerContainer = getContainer(CONTAINERS.REGISTER)
  
  let entries: Array<{ date: string; payment: number; attended: boolean; attendanceStatus?: string }> = []
  
  try {
    // Billable sessions: present OR late-cancellation OR (legacy: attended=true with no status)
    const result = await registerContainer.items
      .query({
        query: `
          SELECT c.date, c.payment, c.attended, c.attendanceStatus 
          FROM c 
          WHERE c.date >= @startDate 
            AND c.date <= @endDate 
            AND (
              c.attendanceStatus IN ('present', 'late-cancellation')
              OR (c.attended = true AND NOT IS_DEFINED(c.attendanceStatus))
            )
        `,
        parameters: [
          { name: '@startDate', value: startDate },
          { name: '@endDate', value: endDate }
        ]
      })
      .fetchAll()
    entries = result.resources
  } catch (e: any) {
    if (e?.code !== 404 && e?.code !== 'NotFound') {
      context.warn('Could not fetch register entries:', e?.message)
    }
  }

  // Aggregate by day of week
  const dayMap = new Map<number, { sessions: number; revenue: number; dates: Set<string> }>()
  
  // Initialise all days
  for (let i = 0; i < 7; i++) {
    dayMap.set(i, { sessions: 0, revenue: 0, dates: new Set() })
  }

  for (const entry of entries) {
    const date = new Date(entry.date)
    const dayIndex = date.getDay()
    const dayData = dayMap.get(dayIndex)!
    
    dayData.sessions += 1
    dayData.revenue += entry.payment || 0
    dayData.dates.add(entry.date)
  }

  // Calculate weeks in date range for averages
  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  const totalWeeks = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (7 * 24 * 60 * 60 * 1000))

  const byDayData: DayOfWeekData[] = []
  
  // Start from Monday (index 1)
  for (let i = 1; i <= 7; i++) {
    const dayIndex = i % 7 // 1,2,3,4,5,6,0 -> Mon-Sun
    const dayData = dayMap.get(dayIndex)!
    const uniqueWeeks = dayData.dates.size > 0 ? Math.ceil(dayData.sessions / Math.max(dayData.dates.size, 1)) : 0
    
    byDayData.push({
      day: dayNames[dayIndex],
      dayIndex,
      totalSessions: dayData.sessions,
      totalRevenue: dayData.revenue,
      averageSessions: totalWeeks > 0 ? dayData.sessions / totalWeeks : 0,
      averageRevenue: totalWeeks > 0 ? dayData.revenue / totalWeeks : 0,
      weeks: uniqueWeeks,
    })
  }

  return successResponse({
    startDate,
    endDate,
    totalWeeks,
    data: byDayData,
  })
}

async function getClientActivityAnalytics(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const limitParam = request.query.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 10
  const inactiveDaysParam = request.query.get('inactiveDays')
  const inactiveDays = inactiveDaysParam ? parseInt(inactiveDaysParam, 10) : 14

  const registerContainer = getContainer(CONTAINERS.REGISTER)
  
  // Get last 6 months of data
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const startDate = sixMonthsAgo.toISOString().split('T')[0]

  let entries: Array<{ clientId: string; clientName: string; date: string; payment: number; attended: boolean; attendanceStatus?: string }> = []
  
  try {
    // Billable sessions: present OR late-cancellation OR (legacy: attended=true with no status)
    const result = await registerContainer.items
      .query({
        query: `
          SELECT c.clientId, c.clientName, c.date, c.payment, c.attended, c.attendanceStatus 
          FROM c 
          WHERE c.date >= @startDate 
            AND (
              c.attendanceStatus IN ('present', 'late-cancellation')
              OR (c.attended = true AND NOT IS_DEFINED(c.attendanceStatus))
            )
        `,
        parameters: [
          { name: '@startDate', value: startDate }
        ]
      })
      .fetchAll()
    entries = result.resources
  } catch (e: any) {
    if (e?.code !== 404 && e?.code !== 'NotFound') {
      context.warn('Could not fetch register entries:', e?.message)
    }
  }

  // Aggregate by client
  const clientMap = new Map<string, {
    clientName: string
    sessions: number
    totalSpent: number
    lastDate: string
  }>()

  for (const entry of entries) {
    const existing = clientMap.get(entry.clientId)
    
    if (existing) {
      existing.sessions += 1
      existing.totalSpent += entry.payment || 0
      if (entry.date > existing.lastDate) {
        existing.lastDate = entry.date
      }
    } else {
      clientMap.set(entry.clientId, {
        clientName: entry.clientName,
        sessions: 1,
        totalSpent: entry.payment || 0,
        lastDate: entry.date,
      })
    }
  }

  const todayMs = now.getTime()
  const clientActivity: ClientActivityData[] = []

  for (const [clientId, data] of clientMap.entries()) {
    const lastAttendedMs = new Date(data.lastDate).getTime()
    const daysSinceAttended = Math.floor((todayMs - lastAttendedMs) / (24 * 60 * 60 * 1000))

    clientActivity.push({
      clientId,
      clientName: data.clientName,
      sessionCount: data.sessions,
      totalSpent: data.totalSpent,
      lastAttended: data.lastDate,
      daysInactive: daysSinceAttended,
    })
  }

  // Sort by sessions descending for top attendees
  const topAttendees = [...clientActivity]
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, limit)

  // Filter for at-risk clients (inactive for X days)
  const atRiskClients = clientActivity
    .filter(c => c.daysInactive >= inactiveDays)
    .sort((a, b) => b.daysInactive - a.daysInactive)

  return successResponse({
    topAttendees,
    atRiskClients,
    totalActiveClients: clientMap.size,
    inactiveDaysThreshold: inactiveDays,
  })
}

async function getComparisonAnalytics(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const periodParam = request.query.get('period') || 'month'
  
  const now = new Date()
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date
  let currentPeriodLabel: string
  let previousPeriodLabel: string
  let isPartialPeriod = false

  if (periodParam === 'month') {
    // Current month (from 1st to today)
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    currentEnd = now
    
    // Get the day of month we're comparing up to
    const currentDayOfMonth = now.getDate()
    
    // Previous month - compare equivalent period (1st to same day of month)
    // This gives an apples-to-apples comparison
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, currentDayOfMonth)
    
    // Check if we're not at the end of the month (partial period)
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    isPartialPeriod = currentDayOfMonth < lastDayOfCurrentMonth
    
    const monthName = now.toLocaleString('en-GB', { month: 'long' })
    const prevMonthName = previousStart.toLocaleString('en-GB', { month: 'long' })
    
    if (isPartialPeriod) {
      currentPeriodLabel = `${monthName} 1-${currentDayOfMonth}`
      previousPeriodLabel = `${prevMonthName} 1-${currentDayOfMonth}`
    } else {
      currentPeriodLabel = `${monthName} ${now.getFullYear()}`
      previousPeriodLabel = `${prevMonthName} ${previousStart.getFullYear()}`
    }
  } else {
    // Default to week
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday)
    currentEnd = now
    previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() - 7)
    previousEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() - 1)
    
    currentPeriodLabel = 'This week'
    previousPeriodLabel = 'Last week'
  }

  const registerContainer = getContainer(CONTAINERS.REGISTER)

  async function getPeriodData(start: Date, end: Date) {
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    try {
      // Billable sessions: present OR late-cancellation OR (legacy: attended=true with no status)
      const result = await registerContainer.items
        .query({
          query: `
            SELECT c.clientId, c.payment 
            FROM c 
            WHERE c.date >= @startDate 
              AND c.date <= @endDate 
              AND (
                c.attendanceStatus IN ('present', 'late-cancellation')
                OR (c.attended = true AND NOT IS_DEFINED(c.attendanceStatus))
              )
          `,
          parameters: [
            { name: '@startDate', value: startStr },
            { name: '@endDate', value: endStr }
          ]
        })
        .fetchAll()

      const entries = result.resources as Array<{ clientId: string; payment: number }>
      const clients = new Set(entries.map(e => e.clientId))
      const revenue = entries.reduce((sum, e) => sum + (e.payment || 0), 0)

      return {
        sessions: entries.length,
        revenue,
        clients: clients.size,
      }
    } catch {
      return { sessions: 0, revenue: 0, clients: 0 }
    }
  }

  const current = await getPeriodData(currentStart, currentEnd)
  const previous = await getPeriodData(previousStart, previousEnd)

  const calculateChange = (curr: number, prev: number) => ({
    value: curr - prev,
    percent: prev > 0 ? ((curr - prev) / prev) * 100 : 0,
  })

  const comparison: ComparisonData = {
    current: {
      period: currentPeriodLabel,
      ...current,
    },
    previous: {
      period: previousPeriodLabel,
      ...previous,
    },
    change: {
      sessions: current.sessions - previous.sessions,
      sessionsPercent: previous.sessions > 0 ? ((current.sessions - previous.sessions) / previous.sessions) * 100 : 0,
      revenue: current.revenue - previous.revenue,
      revenuePercent: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      clients: current.clients - previous.clients,
      clientsPercent: previous.clients > 0 ? ((current.clients - previous.clients) / previous.clients) * 100 : 0,
    },
    isPartialPeriod,
  }

  return successResponse(comparison)
}

app.http('dashboard-analytics', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard/analytics',
  handler: getDashboardAnalytics,
})






