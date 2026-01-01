import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  getDashboardStats, 
  getDashboardTrends, 
  getComparisonData,
  getClientActivity,
  getDashboardAnalytics,
  getInvoiceStatusBreakdown,
} from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { chartColors, formatters } from '@/lib/chartTheme'
import {
  DashboardTabs,
  DashboardTabContent,
  TabHeader,
  DashboardWidget,
  StatCard,
  ChartCard,
  ChartLegend,
  TrendIndicator,
  EmptyChart,
  type DashboardTab,
} from '@/components/dashboard'
import { Card, CardHeader, CardTitle, CardContent, Skeleton, Badge, Button } from '@/components/ui'
import {
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CurrencyPoundIcon,
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { ByDayAnalyticsResponse } from '@/types'

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-500">Welcome to your dashboard</p>
      </div>

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab}>
        <DashboardTabContent value="overview">
          <OverviewTab />
        </DashboardTabContent>
        
        <DashboardTabContent value="financial">
          <FinancialTab />
        </DashboardTabContent>
        
        <DashboardTabContent value="clients">
          <ClientsTab />
        </DashboardTabContent>
        
        <DashboardTabContent value="operations">
          <OperationsTab />
        </DashboardTabContent>
        
        <DashboardTabContent value="invoices">
          <InvoicesTab />
        </DashboardTabContent>
        
        <DashboardTabContent value="trends">
          <TrendsTab />
        </DashboardTabContent>
      </DashboardTabs>
    </div>
  )
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const [copied, setCopied] = useState(false)
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ['dashboard-comparison'],
    queryFn: () => getComparisonData('month'),
  })

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', 6],
    queryFn: () => getDashboardTrends(6),
  })

  const isLoading = statsLoading || comparisonLoading

  // Copy registration link to clipboard
  const copyRegistrationLink = useCallback(() => {
    const url = `${window.location.origin}/client-registration`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={<UserGroupIcon className="h-6 w-6" />}
          iconBackground="bg-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Sessions This Month"
          value={stats?.sessionsThisMonth ?? 0}
          previousValue={comparison?.previous.sessions}
          currentValue={comparison?.current.sessions}
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
          iconBackground="bg-green-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Revenue This Month"
          value={formatCurrency(stats?.revenueThisMonth ?? 0)}
          previousValue={comparison?.previous.revenue}
          currentValue={comparison?.current.revenue}
          icon={<CurrencyPoundIcon className="h-6 w-6" />}
          iconBackground="bg-primary-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Unpaid Invoices"
          value={stats?.unpaidInvoices ?? 0}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          iconBackground="bg-amber-500"
          isLoading={isLoading}
        />
      </div>

      {/* Revenue Trend Mini Chart */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          description="Last 6 months"
          isLoading={trendsLoading}
          height={250}
        >
          {trends?.monthly && trends.monthly.length > 0 ? (
            <AreaChart data={trends.monthly}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
              <XAxis 
                dataKey="monthName" 
                tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
                tickFormatter={(v) => v.slice(0, 3)}
              />
              <YAxis 
                tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
                tickFormatter={formatters.shortNumber}
                width={40}
              />
              <Tooltip 
                formatter={(value: number) => [formatters.currency(value), 'Revenue']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                stroke={chartColors.primary}
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          ) : (
            <EmptyChart message="No revenue data yet" />
          )}
        </ChartCard>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <a
                href="/register"
                className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 p-3 sm:p-4 transition-all hover:border-primary-300 hover:bg-primary-50 text-center sm:text-left"
              >
                <ClipboardDocumentCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Register</p>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Record attendance</p>
                </div>
              </a>
              <a
                href="/clients"
                className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 p-3 sm:p-4 transition-all hover:border-accent-300 hover:bg-accent-50 text-center sm:text-left"
              >
                <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-accent-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Clients</p>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">View or add</p>
                </div>
              </a>
              <a
                href="/invoices"
                className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 p-3 sm:p-4 transition-all hover:border-blue-300 hover:bg-blue-50 text-center sm:text-left"
              >
                <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Invoices</p>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Check payments</p>
                </div>
              </a>
              <a
                href="/registrations"
                className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 p-3 sm:p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50 text-center sm:text-left"
              >
                <ClipboardDocumentIcon className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Registrations</p>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Review submissions</p>
                </div>
              </a>
            </div>
            
            {/* Share Registration Form Link */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-1">📋 Client Registration Form</p>
                  <p className="text-xs text-gray-500">Share this link with new or existing clients</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href="/client-registration"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Open Form</span>
                    <span className="sm:hidden">Open</span>
                  </a>
                  <button
                    onClick={copyRegistrationLink}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy Link</span>
                        <span className="sm:hidden">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Clients Alert */}
      <AtRiskClientsWidget />
    </div>
  )
}

// ============================================================================
// FINANCIAL TAB
// ============================================================================

function FinancialTab() {
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', 12],
    queryFn: () => getDashboardTrends(12),
  })

  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: ['dashboard-comparison'],
    queryFn: () => getComparisonData('month'),
  })

  const { data: byDayData, isLoading: byDayLoading } = useQuery({
    queryKey: ['dashboard-analytics', 'revenue-by-day'],
    queryFn: () => getDashboardAnalytics('revenue-by-day'),
  })

  return (
    <div className="space-y-6">
      <TabHeader tab="financial" />

      {/* Comparison Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ComparisonCard
          label="Sessions"
          current={comparison?.current.sessions ?? 0}
          previous={comparison?.previous.sessions ?? 0}
          currentPeriod={comparison?.current.period ?? 'This month'}
          previousPeriod={comparison?.previous.period ?? 'Last month'}
          isLoading={comparisonLoading}
          isPartialPeriod={comparison?.isPartialPeriod}
        />
        <ComparisonCard
          label="Revenue"
          current={comparison?.current.revenue ?? 0}
          previous={comparison?.previous.revenue ?? 0}
          currentPeriod={comparison?.current.period ?? 'This month'}
          previousPeriod={comparison?.previous.period ?? 'Last month'}
          format="currency"
          isLoading={comparisonLoading}
          isPartialPeriod={comparison?.isPartialPeriod}
        />
        <ComparisonCard
          label="Unique Clients"
          current={comparison?.current.clients ?? 0}
          previous={comparison?.previous.clients ?? 0}
          currentPeriod={comparison?.current.period ?? 'This month'}
          previousPeriod={comparison?.previous.period ?? 'Last month'}
          isLoading={comparisonLoading}
          isPartialPeriod={comparison?.isPartialPeriod}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend - 12 months */}
        <ChartCard
          title="Revenue Trend"
          description="Last 12 months"
          isLoading={trendsLoading}
          height={300}
          footer={
            trends?.summary && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total: <strong className="text-gray-900">{formatCurrency(trends.summary.totalRevenue)}</strong></span>
                <span className="text-gray-500">Avg: <strong className="text-gray-900">{formatCurrency(trends.summary.averageMonthlyRevenue)}</strong>/mo</span>
              </div>
            )
          }
        >
          {trends?.monthly && trends.monthly.length > 0 ? (
            <AreaChart data={trends.monthly}>
              <defs>
                <linearGradient id="revenueGradientFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
              <XAxis 
                dataKey="monthName" 
                tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
                tickFormatter={(v) => v.slice(0, 3)}
              />
              <YAxis 
                tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
                tickFormatter={formatters.shortNumber}
              />
              <Tooltip 
                formatter={(value: number) => [formatters.currency(value), 'Revenue']}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                stroke={chartColors.primary}
                strokeWidth={2}
                fill="url(#revenueGradientFull)"
              />
            </AreaChart>
          ) : (
            <EmptyChart message="No revenue data available" />
          )}
        </ChartCard>

        {/* Revenue by Day of Week */}
        <ChartCard
          title="Revenue by Day"
          description="Average per weekday"
          isLoading={byDayLoading}
          height={300}
        >
          {(byDayData as ByDayAnalyticsResponse)?.data?.length > 0 ? (
            <BarChart data={(byDayData as ByDayAnalyticsResponse).data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
              <XAxis 
                dataKey="day" 
                tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
                tickFormatter={(v) => v.slice(0, 3)}
              />
              <YAxis 
                tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
                tickFormatter={formatters.shortNumber}
              />
              <Tooltip 
                formatter={(value: number) => [formatters.currency(value), 'Avg Revenue']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="averageRevenue" 
                fill={chartColors.primary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <EmptyChart message="No day-by-day data available" />
          )}
        </ChartCard>
      </div>

      {/* Sessions Chart */}
      <ChartCard
        title="Sessions per Month"
        description="Attendance over time"
        isLoading={trendsLoading}
        height={250}
        legend={
          <ChartLegend 
            items={[
              { color: chartColors.secondary, label: 'Sessions' },
              { color: chartColors.tertiary, label: 'Unique Clients' },
            ]} 
          />
        }
      >
        {trends?.monthly && trends.monthly.length > 0 ? (
          <BarChart data={trends.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
            <XAxis 
              dataKey="monthName" 
              tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <YAxis tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="totalSessions" name="Sessions" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="uniqueClients" name="Unique Clients" fill={chartColors.tertiary} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <EmptyChart message="No session data available" />
        )}
      </ChartCard>
    </div>
  )
}

// ============================================================================
// CLIENTS TAB
// ============================================================================

function ClientsTab() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: clientActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-client-activity'],
    queryFn: () => getClientActivity(10, 14),
  })

  return (
    <div className="space-y-6">
      <TabHeader tab="clients" />

      {/* Client Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={<UserGroupIcon className="h-6 w-6" />}
          iconBackground="bg-blue-500"
          isLoading={statsLoading}
        />
        <StatCard
          label="Active Clients"
          value={stats?.activeClients ?? 0}
          icon={<UserGroupIcon className="h-6 w-6" />}
          iconBackground="bg-green-500"
          isLoading={statsLoading}
        />
        <StatCard
          label="At Risk"
          value={clientActivity?.atRiskClients.length ?? 0}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          iconBackground="bg-amber-500"
          isLoading={activityLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Attendees */}
        <DashboardWidget
          title="Top Attendees"
          description="Most active clients (last 6 months)"
          isLoading={activityLoading}
        >
          {clientActivity?.topAttendees && clientActivity.topAttendees.length > 0 ? (
            <div className="space-y-3">
              {clientActivity.topAttendees.slice(0, 5).map((client, index) => (
                <div key={client.clientId} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{client.clientName}</p>
                    <p className="text-xs text-gray-500">{client.sessionCount} sessions</p>
                    </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(client.totalSpent)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No attendance data yet</p>
          )}
        </DashboardWidget>

        {/* At Risk Clients */}
        <DashboardWidget
          title="Clients at Risk"
          description={`Not attended in ${clientActivity?.inactiveDaysThreshold ?? 14}+ days`}
          isLoading={activityLoading}
          headerAction={
            clientActivity?.atRiskClients.length ? (
              <Badge variant="warning">{clientActivity.atRiskClients.length}</Badge>
            ) : null
          }
        >
          {clientActivity?.atRiskClients && clientActivity.atRiskClients.length > 0 ? (
            <div className="space-y-3">
              {clientActivity.atRiskClients.slice(0, 5).map((client) => (
                <div key={client.clientId} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{client.clientName}</p>
                    <p className="text-xs text-amber-700">
                      Last seen: {new Date(client.lastAttended).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-200">
                    {client.daysInactive} days
                  </Badge>
                </div>
              ))}
              {clientActivity.atRiskClients.length > 5 && (
                <p className="text-sm text-center text-gray-500">
                  +{clientActivity.atRiskClients.length - 5} more
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-gray-600 font-medium">All clients active!</p>
              <p className="text-sm text-gray-500">No clients at risk</p>
            </div>
          )}
        </DashboardWidget>
      </div>
    </div>
  )
}

// ============================================================================
// OPERATIONS TAB
// ============================================================================

function OperationsTab() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: byDayData, isLoading: byDayLoading } = useQuery({
    queryKey: ['dashboard-analytics', 'attendance-by-day'],
    queryFn: () => getDashboardAnalytics('attendance-by-day'),
  })

  return (
    <div className="space-y-6">
      <TabHeader 
        tab="operations" 
        action={
          <Button asChild>
            <a href="/register">
              <ClipboardDocumentCheckIcon className="mr-2 h-4 w-4" />
              Take Register
            </a>
          </Button>
        }
      />

      {/* Today's Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sessions Today"
          value={stats?.sessionsThisMonth ? Math.round(stats.sessionsThisMonth / new Date().getDate()) : 0}
          icon={<CalendarIcon className="h-6 w-6" />}
          iconBackground="bg-primary-500"
          isLoading={statsLoading}
          size="sm"
        />
        <StatCard
          label="This Month"
          value={stats?.sessionsThisMonth ?? 0}
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
          iconBackground="bg-blue-500"
          isLoading={statsLoading}
          size="sm"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(stats?.revenueThisMonth ?? 0)}
          icon={<CurrencyPoundIcon className="h-6 w-6" />}
          iconBackground="bg-green-500"
          isLoading={statsLoading}
          size="sm"
        />
        <StatCard
          label="Active Clients"
          value={stats?.activeClients ?? 0}
          icon={<UserGroupIcon className="h-6 w-6" />}
          iconBackground="bg-accent-500"
          isLoading={statsLoading}
          size="sm"
        />
      </div>

      {/* Attendance by Day */}
      <ChartCard
        title="Attendance by Day of Week"
        description="Average sessions per weekday"
        isLoading={byDayLoading}
        height={300}
      >
        {(byDayData as ByDayAnalyticsResponse)?.data?.length > 0 ? (
          <BarChart data={(byDayData as ByDayAnalyticsResponse).data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
            <XAxis type="number" tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }} />
            <YAxis 
              type="category" 
              dataKey="day" 
              tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
              tickFormatter={(v) => v.slice(0, 3)}
              width={40}
            />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(1), 'Avg Sessions']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="averageSessions" 
              fill={chartColors.secondary}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        ) : (
          <EmptyChart message="No attendance data available" />
        )}
      </ChartCard>
    </div>
  )
}

// ============================================================================
// INVOICES TAB
// ============================================================================

function InvoicesTab() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: invoiceStatus, isLoading: invoiceStatusLoading } = useQuery({
    queryKey: ['dashboard-invoice-status'],
    queryFn: getInvoiceStatusBreakdown,
  })

  // Build invoice status data from API response
  const invoiceStatusData = [
    { name: 'Paid', value: invoiceStatus?.paid ?? 0, color: chartColors.success },
    { name: 'Sent', value: invoiceStatus?.sent ?? 0, color: chartColors.info },
    { name: 'Overdue', value: invoiceStatus?.overdue ?? 0, color: chartColors.error },
    { name: 'Draft', value: invoiceStatus?.draft ?? 0, color: chartColors.neutral.textMuted },
  ]

  // Filter out zero values for cleaner chart
  const filteredStatusData = invoiceStatusData.filter(d => d.value > 0)
  const totalInvoices = invoiceStatusData.reduce((sum, d) => sum + d.value, 0)

  const isLoading = statsLoading || invoiceStatusLoading

  return (
    <div className="space-y-6">
      <TabHeader 
        tab="invoices" 
        action={
          <Button asChild variant="outline">
            <a href="/invoices">View All Invoices</a>
          </Button>
        }
      />

      {/* Invoice Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Unpaid Invoices"
          value={stats?.unpaidInvoices ?? 0}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          iconBackground="bg-amber-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Outstanding Amount"
          value={formatCurrency(invoiceStatus?.totalOutstanding ?? stats?.unpaidAmount ?? 0)}
          icon={<CurrencyPoundIcon className="h-6 w-6" />}
          iconBackground="bg-red-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Revenue This Month"
          value={formatCurrency(stats?.revenueThisMonth ?? 0)}
          icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
          iconBackground="bg-green-500"
          isLoading={isLoading}
        />
      </div>

      {/* Invoice Status Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Invoice Status"
          description={`${totalInvoices} total invoices`}
          isLoading={isLoading}
          height={250}
          legend={
            <ChartLegend 
              items={invoiceStatusData.map(d => ({ 
                color: d.color, 
                label: d.name,
                value: d.value,
              }))} 
            />
          }
        >
          {filteredStatusData.length > 0 ? (
            <PieChart>
              <Pie
                data={filteredStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {filteredStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          ) : (
            <EmptyChart message="No invoices yet" />
          )}
        </ChartCard>

        <DashboardWidget
          title="Outstanding Payments"
          description="Invoices requiring attention"
          isLoading={isLoading}
        >
          {(invoiceStatus?.totalOutstanding ?? stats?.unpaidAmount ?? 0) > 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-amber-800 font-medium">Total Outstanding</span>
                  <span className="text-2xl font-bold text-amber-900">
                    {formatCurrency(invoiceStatus?.totalOutstanding ?? stats?.unpaidAmount ?? 0)}
                  </span>
                </div>
              </div>
              {(invoiceStatus?.overdue ?? 0) > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="text-red-800 font-medium text-sm">Overdue</span>
                    <Badge variant="error">{invoiceStatus?.overdue} invoice{(invoiceStatus?.overdue ?? 0) !== 1 ? 's' : ''}</Badge>
                  </div>
                </div>
              )}
              <Button asChild className="w-full">
                <a href="/invoices?status=unpaid">Review Unpaid Invoices</a>
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
                <CurrencyPoundIcon className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-gray-600 font-medium">All paid up!</p>
              <p className="text-sm text-gray-500">No outstanding invoices</p>
            </div>
          )}
        </DashboardWidget>
      </div>
    </div>
  )
}

// ============================================================================
// TRENDS TAB
// ============================================================================

function TrendsTab() {
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', 12],
    queryFn: () => getDashboardTrends(12),
  })

  return (
    <div className="space-y-6">
      <TabHeader tab="trends" />

      {/* Summary Stats */}
      {trends?.summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Revenue (12mo)"
            value={formatCurrency(trends.summary.totalRevenue)}
            icon={<CurrencyPoundIcon className="h-6 w-6" />}
            iconBackground="bg-primary-500"
            size="sm"
          />
          <StatCard
            label="Total Sessions"
            value={trends.summary.totalSessions}
            icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
            iconBackground="bg-blue-500"
            size="sm"
          />
          <StatCard
            label="Avg Monthly Revenue"
            value={formatCurrency(trends.summary.averageMonthlyRevenue)}
            icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
            iconBackground="bg-green-500"
            size="sm"
          />
          <StatCard
            label="Growth Rate"
            value={`${trends.summary.growthRate >= 0 ? '+' : ''}${trends.summary.growthRate.toFixed(1)}%`}
            trend={trends.summary.growthRate > 0 ? 'up' : trends.summary.growthRate < 0 ? 'down' : 'neutral'}
            icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
            iconBackground={trends.summary.growthRate >= 0 ? 'bg-green-500' : 'bg-red-500'}
            size="sm"
          />
        </div>
      )}

      {/* Full Year Revenue Chart */}
      <ChartCard
        title="12-Month Revenue Trend"
        description="Monthly revenue over the past year"
        isLoading={trendsLoading}
        height={350}
      >
        {trends?.monthly && trends.monthly.length > 0 ? (
          <AreaChart data={trends.monthly}>
            <defs>
              <linearGradient id="yearRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
            <XAxis 
              dataKey="monthName" 
              tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <YAxis 
              tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
              tickFormatter={formatters.currency}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatters.currency(value), 
                name === 'totalRevenue' ? 'Revenue' : name
              ]}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="totalRevenue"
              stroke={chartColors.primary}
              strokeWidth={2}
              fill="url(#yearRevenueGradient)"
            />
          </AreaChart>
        ) : (
          <EmptyChart message="Not enough data for trends" />
        )}
      </ChartCard>

      {/* Sessions & Clients Trend */}
      <ChartCard
        title="Sessions & Client Activity"
        description="Monthly comparison"
        isLoading={trendsLoading}
        height={300}
        legend={
          <ChartLegend 
            items={[
              { color: chartColors.secondary, label: 'Sessions' },
              { color: chartColors.tertiary, label: 'Unique Clients' },
            ]} 
          />
        }
      >
        {trends?.monthly && trends.monthly.length > 0 ? (
          <BarChart data={trends.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.neutral.gridLight} />
            <XAxis 
              dataKey="monthName" 
              tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <YAxis tick={{ fill: chartColors.neutral.textMuted, fontSize: 11 }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="totalSessions" name="Sessions" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
            <Bar dataKey="uniqueClients" name="Unique Clients" fill={chartColors.tertiary} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <EmptyChart message="Not enough data for trends" />
        )}
      </ChartCard>
    </div>
  )
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function AtRiskClientsWidget() {
  const { data: clientActivity, isLoading } = useQuery({
    queryKey: ['dashboard-client-activity'],
    queryFn: () => getClientActivity(5, 14),
  })

  if (isLoading) return null
  if (!clientActivity?.atRiskClients.length) return null

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Clients Need Attention</h3>
            <p className="text-sm text-amber-700 mb-2">
              {clientActivity.atRiskClients.length} client{clientActivity.atRiskClients.length > 1 ? 's have' : ' has'} not attended in over {clientActivity.inactiveDaysThreshold} days.
            </p>
            <div className="flex flex-wrap gap-2">
              {clientActivity.atRiskClients.slice(0, 3).map((client) => (
                <Badge key={client.clientId} variant="outline" className="bg-white border-amber-300 text-amber-800">
                  {client.clientName}
                </Badge>
              ))}
              {clientActivity.atRiskClients.length > 3 && (
                <Badge variant="outline" className="bg-white border-amber-300 text-amber-800">
                  +{clientActivity.atRiskClients.length - 3} more
                </Badge>
              )}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
            <a href="/clients?filter=at-risk">View All</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface ComparisonCardProps {
  label: string
  current: number
  previous: number
  currentPeriod?: string
  previousPeriod: string
  format?: 'number' | 'currency'
  isLoading?: boolean
  isPartialPeriod?: boolean
}

function ComparisonCard({
  label,
  current,
  previous,
  currentPeriod,
  previousPeriod,
  format = 'number',
  isLoading,
  isPartialPeriod,
}: ComparisonCardProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const formatValue = format === 'currency' ? formatCurrency : (v: number) => v.toString()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm text-gray-500">{label}</p>
          {isPartialPeriod && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-gray-400 border-gray-200">
              MTD
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900">{formatValue(current)}</p>
          <TrendIndicator 
            direction={direction}
            value={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {currentPeriod && <span className="text-gray-500">{currentPeriod}</span>}
          {currentPeriod && ' vs '}
          {formatValue(previous)} ({previousPeriod})
        </p>
      </CardContent>
    </Card>
  )
}
