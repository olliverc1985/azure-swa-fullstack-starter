import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'neutral'
  value: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  /** Whether "up" is positive (default) or negative (e.g., for costs) */
  invertColors?: boolean
  className?: string
}

/**
 * Trend indicator showing direction and percentage change.
 * Colour-coded: green for positive, red for negative, grey for neutral.
 */
export function TrendIndicator({
  direction,
  value,
  label,
  size = 'sm',
  invertColors = false,
  className,
}: TrendIndicatorProps) {
  const isPositive = invertColors 
    ? direction === 'down' 
    : direction === 'up'
  
  const isNegative = invertColors 
    ? direction === 'up' 
    : direction === 'down'

  const sizeClasses = {
    sm: {
      container: 'text-xs px-1.5 py-0.5',
      icon: 'h-3 w-3',
    },
    md: {
      container: 'text-sm px-2 py-1',
      icon: 'h-4 w-4',
    },
    lg: {
      container: 'text-base px-3 py-1.5',
      icon: 'h-5 w-5',
    },
  }

  const sizes = sizeClasses[size]

  const colorClasses = isPositive
    ? 'bg-green-100 text-green-700'
    : isNegative
    ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600'

  const Icon = direction === 'up' 
    ? ArrowUpIcon 
    : direction === 'down' 
    ? ArrowDownIcon 
    : MinusIcon

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-medium',
        sizes.container,
        colorClasses,
        className
      )}
      title={label}
    >
      <Icon className={sizes.icon} />
      <span>{value}</span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

// Simple arrow-only indicator for tight spaces
interface TrendArrowProps {
  direction: 'up' | 'down' | 'neutral'
  invertColors?: boolean
  className?: string
}

export function TrendArrow({ direction, invertColors = false, className }: TrendArrowProps) {
  const isPositive = invertColors ? direction === 'down' : direction === 'up'
  const isNegative = invertColors ? direction === 'up' : direction === 'down'

  const colorClass = isPositive
    ? 'text-green-500'
    : isNegative
    ? 'text-red-500'
    : 'text-gray-400'

  const Icon = direction === 'up' 
    ? ArrowUpIcon 
    : direction === 'down' 
    ? ArrowDownIcon 
    : MinusIcon

  return <Icon className={cn('h-4 w-4', colorClass, className)} />
}

// Percentage change badge
interface PercentageChangeProps {
  current: number
  previous: number
  invertColors?: boolean
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function PercentageChange({
  current,
  previous,
  invertColors = false,
  size = 'sm',
  showLabel = false,
  className,
}: PercentageChangeProps) {
  if (previous === 0) {
    return (
      <TrendIndicator
        direction="neutral"
        value="N/A"
        size={size}
        className={className}
      />
    )
  }

  const change = ((current - previous) / previous) * 100
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const value = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
  const label = showLabel ? `vs previous period` : undefined

  return (
    <TrendIndicator
      direction={direction}
      value={value}
      label={label}
      size={size}
      invertColors={invertColors}
      className={className}
    />
  )
}
























