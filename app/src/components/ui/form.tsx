import * as React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// FormGrid - Responsive grid layout for form fields
// ============================================================================

interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns (1-4). Default is 2 on larger screens. */
  columns?: 1 | 2 | 3 | 4
}

export function FormGrid({ columns = 2, className, children, ...props }: FormGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================================================
// FormSection - Collapsible section with header
// ============================================================================

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title: string
  /** Optional icon to display before title */
  icon?: React.ReactNode
  /** Description text below title */
  description?: string
  /** Whether section is collapsible */
  collapsible?: boolean
  /** Default expanded state (only if collapsible) */
  defaultExpanded?: boolean
  /** Colour variant for the header */
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'success'
  /** Badge to show completion status */
  badge?: React.ReactNode
}

const sectionVariants = {
  default: {
    border: 'border-gray-200',
    header: 'bg-gray-50 hover:bg-gray-100',
    text: 'text-gray-800',
    icon: 'text-gray-600',
  },
  info: {
    border: 'border-blue-200',
    header: 'bg-blue-50 hover:bg-blue-100',
    text: 'text-blue-800',
    icon: 'text-blue-600',
  },
  warning: {
    border: 'border-amber-200',
    header: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-800',
    icon: 'text-amber-600',
  },
  danger: {
    border: 'border-red-200',
    header: 'bg-red-50 hover:bg-red-100',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
  success: {
    border: 'border-green-200',
    header: 'bg-green-50 hover:bg-green-100',
    text: 'text-green-800',
    icon: 'text-green-600',
  },
}

export function FormSection({
  title,
  icon,
  description,
  collapsible = false,
  defaultExpanded = false,
  variant = 'default',
  badge,
  className,
  children,
  ...props
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const styles = sectionVariants[variant]

  const headerContent = (
    <span className={cn('flex items-center gap-2 text-sm font-medium', styles.text)}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {title}
      {badge}
    </span>
  )

  if (!collapsible) {
    return (
      <div className={cn('border rounded-lg overflow-hidden', styles.border, className)} {...props}>
        <div className={cn('p-3', styles.header)}>
          {headerContent}
          {description && <p className={cn('text-xs mt-1', styles.icon)}>{description}</p>}
        </div>
        <div className="p-3 space-y-3 bg-white">{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', styles.border, className)} {...props}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn('w-full flex items-center justify-between p-3 transition-colors', styles.header)}
      >
        {headerContent}
        <svg
          className={cn('h-4 w-4 transition-transform', styles.icon, isExpanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="p-3 space-y-3 bg-white">
          {description && <p className={cn('text-xs', styles.icon)}>{description}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// FormField - Wrapper for form inputs with label and error handling
// ============================================================================

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label */
  label?: string
  /** Whether field is required */
  required?: boolean
  /** Error message to display */
  error?: string
  /** Helper text below the input */
  helperText?: string
  /** Span multiple columns */
  colSpan?: 1 | 2 | 3 | 4 | 'full'
}

export function FormField({
  label,
  required,
  error,
  helperText,
  colSpan,
  className,
  children,
  ...props
}: FormFieldProps) {
  const fieldId = React.useId()

  return (
    <div
      className={cn(
        colSpan === 'full' && 'sm:col-span-full',
        colSpan === 2 && 'sm:col-span-2',
        colSpan === 3 && 'sm:col-span-3',
        colSpan === 4 && 'sm:col-span-4',
        className
      )}
      {...props}
    >
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            id: fieldId,
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined,
          } as React.HTMLAttributes<HTMLElement>)
        }
        return child
      })}
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${fieldId}-helper`} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// FormActions - Footer with action buttons
// ============================================================================

interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Align buttons (start, center, end, between) */
  align?: 'start' | 'center' | 'end' | 'between'
}

export function FormActions({ align = 'end', className, children, ...props }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4',
        align === 'start' && 'sm:justify-start',
        align === 'center' && 'sm:justify-center',
        align === 'end' && 'sm:justify-end',
        align === 'between' && 'sm:justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

