import { cn } from '@/lib/utils'

export interface RadioOption {
  value: string
  label: string
  description?: string
}

export interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  className,
  orientation = 'horizontal',
}: RadioGroupProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className={cn(
        'flex gap-4',
        orientation === 'vertical' && 'flex-col gap-2'
      )}>
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
            {option.description && (
              <span className="text-xs text-gray-500">({option.description})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

export { RadioGroup }
