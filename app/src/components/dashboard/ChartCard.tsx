import { ReactNode } from 'react'
import { DashboardWidget } from './DashboardWidget'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  isLoading?: boolean
  error?: Error | null
  className?: string
  headerAction?: ReactNode
  height?: number | string
  aspectRatio?: number
  /** Show a legend below the chart */
  legend?: ReactNode
  /** Footer content (e.g., summary stats) */
  footer?: ReactNode
}

/**
 * Wrapper component for charts with consistent styling,
 * responsive container, and optional legend/footer.
 */
export function ChartCard({
  title,
  description,
  children,
  isLoading = false,
  error = null,
  className,
  headerAction,
  height = 300,
  aspectRatio,
  legend,
  footer,
}: ChartCardProps) {
  // Reduce height on mobile for better fit
  const mobileHeight = typeof height === 'number' ? Math.min(height, 220) : height
  
  return (
    <DashboardWidget
      title={title}
      description={description}
      isLoading={isLoading}
      error={error}
      className={className}
      headerAction={headerAction}
      noPadding
    >
      <div className="px-3 sm:px-6 pb-2">
        {/* Mobile: Fixed smaller height, Desktop: Original height */}
        <div 
          className="w-full"
          style={aspectRatio ? { aspectRatio } : undefined}
        >
          {!aspectRatio && (
            <>
              {/* Mobile height */}
              <div className="sm:hidden" style={{ height: mobileHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  {children as React.ReactElement}
                </ResponsiveContainer>
              </div>
              {/* Desktop height */}
              <div className="hidden sm:block" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                  {children as React.ReactElement}
                </ResponsiveContainer>
              </div>
            </>
          )}
          {aspectRatio && (
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          )}
        </div>
        
        {legend && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-primary-100/30">
            {legend}
          </div>
        )}
        
        {footer && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-primary-100/30">
            {footer}
          </div>
        )}
      </div>
    </DashboardWidget>
  )
}

// Chart legend item component
interface LegendItemProps {
  color: string
  label: string
  value?: string | number
  className?: string
}

export function ChartLegendItem({ color, label, value, className }: LegendItemProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span 
        className="h-3 w-3 rounded-full flex-shrink-0" 
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-gray-600">{label}</span>
      {value !== undefined && (
        <span className="text-sm font-medium text-gray-900 ml-auto">{value}</span>
      )}
    </div>
  )
}

// Horizontal legend row
interface ChartLegendProps {
  items: Array<{ color: string; label: string; value?: string | number }>
  className?: string
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-x-6 gap-y-2', className)}>
      {items.map((item, index) => (
        <ChartLegendItem
          key={index}
          color={item.color}
          label={item.label}
          value={item.value}
        />
      ))}
    </div>
  )
}

// Empty state for charts with no data
interface EmptyChartProps {
  message?: string
  height?: number
}

export function EmptyChart({ message = 'No data available', height = 200 }: EmptyChartProps) {
  return (
    <div 
      className="flex items-center justify-center text-gray-400"
      style={{ height }}
    >
      <p className="text-sm">{message}</p>
    </div>
  )
}



