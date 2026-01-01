import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 ring-1 ring-blue-200/50',
        secondary: 'bg-gradient-to-r from-accent-100 to-accent-50 text-accent-700 ring-1 ring-accent-200/50',
        success: 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 ring-1 ring-green-200/50',
        warning: 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 ring-1 ring-amber-200/50',
        error: 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 ring-1 ring-red-200/50',
        info: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 ring-1 ring-blue-200/50',
        outline: 'border border-blue-200 text-gray-700 bg-white/60 backdrop-blur-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }


