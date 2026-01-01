import * as Tabs from '@radix-ui/react-tabs'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CurrencyPoundIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'

export type DashboardTab = 
  | 'overview' 
  | 'financial' 
  | 'clients' 
  | 'operations' 
  | 'invoices' 
  | 'trends'

interface TabConfig {
  id: DashboardTab
  label: string
  icon: typeof HomeIcon
  description: string
}

export const dashboardTabs: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: HomeIcon,
    description: 'Key metrics at a glance',
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: CurrencyPoundIcon,
    description: 'Revenue and income insights',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: UserGroupIcon,
    description: 'Client analytics and retention',
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: ClipboardDocumentCheckIcon,
    description: 'Daily operational metrics',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: DocumentTextIcon,
    description: 'Payment and invoice tracking',
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: ChartBarIcon,
    description: 'Historical trends and forecasts',
  },
]

interface DashboardTabsProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  children: ReactNode
}

/**
 * Tabbed navigation for the dashboard sections.
 * Uses Radix UI Tabs for accessibility.
 */
export function DashboardTabs({ activeTab, onTabChange, children }: DashboardTabsProps) {
  return (
    <Tabs.Root 
      value={activeTab} 
      onValueChange={(v) => onTabChange(v as DashboardTab)}
      className="w-full"
    >
      {/* Mobile: Horizontal scrollable pills */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide">
        <Tabs.List className="flex gap-1 sm:gap-1 pb-1 mb-4 sm:mb-6 border-b border-gray-200 min-w-max sm:min-w-0">
          {dashboardTabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'group flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all whitespace-nowrap',
                'border-b-2 -mb-[2px]',
                'hover:bg-gray-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'data-[state=active]:border-primary-500 data-[state=active]:text-primary-600',
                'data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500'
              )}
            >
              <tab.icon className={cn(
                'h-4 w-4 sm:h-5 sm:w-5 transition-colors flex-shrink-0',
                'group-data-[state=active]:text-primary-500',
                'group-data-[state=inactive]:text-gray-400'
              )} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      {children}
    </Tabs.Root>
  )
}

interface DashboardTabContentProps {
  value: DashboardTab
  children: ReactNode
}

export function DashboardTabContent({ value, children }: DashboardTabContentProps) {
  return (
    <Tabs.Content 
      value={value}
      className="animate-fade-in focus:outline-none"
    >
      {children}
    </Tabs.Content>
  )
}

// Tab header with title and description
interface TabHeaderProps {
  tab: DashboardTab
  action?: ReactNode
}

export function TabHeader({ tab, action }: TabHeaderProps) {
  const config = dashboardTabs.find((t) => t.id === tab)
  if (!config) return null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
          <config.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500" />
          {config.label}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{config.description}</p>
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  )
}



