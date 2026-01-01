import { ReactNode } from 'react'
import { Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import { TrendIndicator } from './TrendIndicator'

interface StatCardProps {
  label: string
  value: string | number
  previousValue?: number
  currentValue?: number
  icon?: ReactNode
  iconBackground?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  trendLabel?: string
  isLoading?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  format?: 'number' | 'currency' | 'percentage'
}

/**
 * Statistic display card with optional trend indicator
 * and icon. Used for KPIs and summary metrics.
 */
export function StatCard({
  label,
  value,
  previousValue,
  currentValue,
  icon,
  iconBackground = 'bg-primary-500',
  trend,
  trendValue,
  trendLabel,
  isLoading = false,
  className,
  size = 'md',
}: StatCardProps) {
  // Calculate trend if previous and current values provided
  const calculatedTrend = calculateTrend(previousValue, currentValue)
  const displayTrend = trend ?? calculatedTrend?.direction
  const displayTrendValue = trendValue ?? calculatedTrend?.percentage

  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'h-8 w-8',
      iconInner: 'h-4 w-4',
      value: 'text-lg',
      label: 'text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'h-10 w-10',
      iconInner: 'h-5 w-5',
      value: 'text-2xl',
      label: 'text-sm',
    },
    lg: {
      container: 'p-6',
      icon: 'h-14 w-14',
      iconInner: 'h-7 w-7',
      value: 'text-4xl',
      label: 'text-base',
    },
  }

  const sizes = sizeClasses[size]

  if (isLoading) {
    return (
      <div className={cn(
        'rounded-xl border border-white/60 bg-white/80 backdrop-blur-sm shadow-soft animate-fade-in',
        sizes.container,
        className
      )}>
        <div className="flex items-center gap-3">
          <Skeleton className={cn('rounded-xl', sizes.icon)} />
          <div className="flex-1">
            <Skeleton className="h-7 w-20 mb-1" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border border-white/60 bg-white/80 backdrop-blur-sm shadow-soft hover:shadow-soft-lg hover:bg-white/90 transition-all duration-300 animate-fade-in group',
      sizes.container,
      className
    )}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn(
            'flex items-center justify-center rounded-xl shadow-lg ring-2 ring-white/50 transition-transform duration-300 group-hover:scale-105',
            iconBackground,
            sizes.icon
          )}>
            <span className={cn('text-white', sizes.iconInner)}>
              {icon}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-gray-900 truncate', sizes.value)}>
            {value}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-gray-600', sizes.label)}>{label}</p>
            {displayTrend && displayTrendValue && (
              <TrendIndicator 
                direction={displayTrend} 
                value={displayTrendValue}
                label={trendLabel}
                size={size === 'lg' ? 'md' : 'sm'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper to calculate trend from two values
function calculateTrend(
  previous?: number,
  current?: number
): { direction: 'up' | 'down' | 'neutral'; percentage: string } | null {
  if (previous === undefined || current === undefined) return null
  if (previous === 0) return { direction: 'neutral', percentage: '0%' }
  
  const change = ((current - previous) / previous) * 100
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const percentage = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
  
  return { direction, percentage }
}

// Compact stat for inline use
interface CompactStatProps {
  label: string
  value: string | number
  className?: string
}

export function CompactStat({ label, value, className }: CompactStatProps) {
  return (
    <div className={cn('text-center', className)}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}















