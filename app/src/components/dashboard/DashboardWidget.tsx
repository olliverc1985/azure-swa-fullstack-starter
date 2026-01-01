import { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/ui'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface DashboardWidgetProps {
  title: string
  description?: string
  children: ReactNode
  isLoading?: boolean
  error?: Error | null
  className?: string
  headerAction?: ReactNode
  noPadding?: boolean
  fullHeight?: boolean
}

/**
 * Base dashboard widget component with consistent styling,
 * loading states, and error handling.
 */
export function DashboardWidget({
  title,
  description,
  children,
  isLoading = false,
  error = null,
  className,
  headerAction,
  noPadding = false,
  fullHeight = false,
}: DashboardWidgetProps) {
  return (
    <Card 
      className={cn(
        'animate-fade-in',
        fullHeight && 'h-full',
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(!noPadding && 'pt-0')}>
        {error ? (
          <WidgetError error={error} />
        ) : isLoading ? (
          <WidgetSkeleton />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  )
}

function WidgetError({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-3">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
      </div>
      <p className="text-sm font-medium text-gray-900">Failed to load data</p>
      <p className="text-xs text-gray-500 mt-1">{error.message}</p>
    </div>
  )
}

// Mini widget variant for smaller stats
interface MiniWidgetProps {
  children: ReactNode
  className?: string
}

export function MiniWidget({ children, className }: MiniWidgetProps) {
  return (
    <div className={cn(
      'rounded-xl border border-white/60 bg-white/80 backdrop-blur-sm p-4 shadow-soft animate-fade-in',
      className
    )}>
      {children}
    </div>
  )
}















