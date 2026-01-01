import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckIcon } from '@heroicons/react/24/solid'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  description?: string
  error?: string
  onChange?: (checked: boolean) => void
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, onChange, onCheckedChange, checked, ...props }, ref) => {
    const generatedId = React.useId()
    const checkboxId = id || generatedId

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="flex items-start">
        <div className="flex h-5 items-center">
          <label htmlFor={checkboxId} className="relative cursor-pointer">
            <input
              type="checkbox"
              id={checkboxId}
              className="peer sr-only"
              ref={ref}
              checked={checked}
              onChange={handleChange}
              aria-invalid={error ? 'true' : 'false'}
              {...props}
            />
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                checked
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300 bg-white hover:border-gray-400',
                error && 'border-red-500',
                className
              )}
            >
              {checked && <CheckIcon className="h-3.5 w-3.5 text-white" />}
            </div>
          </label>
        </div>
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }


