/**
 * Chart Theme Configuration
 * Defines consistent colours and styling for Recharts components
 * matching your brand palette
 */

// Brand colour palette from Tailwind config
export const chartColors = {
  // Primary series colours
  primary: '#ee7410',      // primary-500 - Main brand colour
  secondary: '#a855f7',    // accent-500 - Purple
  tertiary: '#22c55e',     // success-500 - Green
  quaternary: '#3b82f6',   // info blue
  quinary: '#f59e0b',      // warning amber
  
  // Extended palette for multiple series
  series: [
    '#ee7410',  // primary-500
    '#a855f7',  // accent-500
    '#22c55e',  // success-500
    '#3b82f6',  // blue
    '#f59e0b',  // amber
    '#ec4899',  // pink
    '#14b8a6',  // teal
    '#8b5cf6',  // violet
  ],
  
  // Status colours
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Primary brand shades (matches Tailwind primary palette)
  brand: {
    50: '#fef7ee',
    100: '#fdecd3',
    200: '#fad5a5',
    300: '#f6b86d',
    400: '#f19132',
    500: '#ee7410',
    600: '#df5a09',
    700: '#b9420a',
  },
  
  // Neutral colours for axes, grid, etc.
  neutral: {
    text: '#374151',       // gray-700
    textMuted: '#6b7280',  // gray-500
    textLight: '#9ca3af',  // gray-400
    grid: '#e5e7eb',       // gray-200
    gridLight: '#f3f4f6',  // gray-100
    background: '#ffffff',
    backgroundAlt: '#f9fafb', // gray-50
  },
}

// Common chart styling props
export const chartDefaults = {
  // Tooltip styling
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '12px',
    },
    labelStyle: {
      color: '#374151',
      fontWeight: 600,
      marginBottom: '4px',
    },
    itemStyle: {
      color: '#6b7280',
      padding: '2px 0',
    },
  },
  
  // Axis styling
  axis: {
    tick: {
      fill: '#6b7280',
      fontSize: 12,
    },
    axisLine: {
      stroke: '#e5e7eb',
    },
    tickLine: {
      stroke: '#e5e7eb',
    },
  },
  
  // Grid styling
  grid: {
    stroke: '#f3f4f6',
    strokeDasharray: '3 3',
  },
  
  // Legend styling
  legend: {
    wrapperStyle: {
      paddingTop: '20px',
    },
  },
  
  // Animation
  animation: {
    duration: 500,
    easing: 'ease-out',
  },
}

// Gradient definitions for area charts
export const gradients = {
  primary: {
    id: 'primaryGradient',
    startColor: 'rgba(238, 116, 16, 0.3)',
    endColor: 'rgba(238, 116, 16, 0.0)',
  },
  secondary: {
    id: 'secondaryGradient',
    startColor: 'rgba(168, 85, 247, 0.3)',
    endColor: 'rgba(168, 85, 247, 0.0)',
  },
  success: {
    id: 'successGradient',
    startColor: 'rgba(34, 197, 94, 0.3)',
    endColor: 'rgba(34, 197, 94, 0.0)',
  },
}

// Helper to get colour by index (cycles through series)
export function getSeriesColor(index: number): string {
  return chartColors.series[index % chartColors.series.length]
}

// Format helpers for chart labels
export const formatters = {
  currency: (value: number) => `£${value.toLocaleString('en-GB')}`,
  percentage: (value: number) => `${value.toFixed(1)}%`,
  number: (value: number) => value.toLocaleString('en-GB'),
  shortNumber: (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  },
}
























