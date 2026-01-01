import { describe, it, expect } from 'vitest'
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatMonthYear,
  generateInvoiceCode,
  generateInvoiceNumber,
  getMonthDateRange,
  isValidEmail,
  isValidPostcode,
  capitalise,
  capitaliseWords,
  groupBy,
} from './utils'

describe('Utility Functions', () => {
  describe('cn (class name merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const isIncluded = true
      const isExcluded = false
      const result = cn('base', isIncluded && 'included', isExcluded && 'excluded')
      expect(result).toBe('base included')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-4 py-2', 'px-6')
      expect(result).toBe('py-2 px-6')
    })

    it('should handle undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2')
      expect(result).toBe('class1 class2')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive amounts in GBP', () => {
      expect(formatCurrency(100)).toBe('£100.00')
    })

    it('should format decimal amounts', () => {
      expect(formatCurrency(36.50)).toBe('£36.50')
    })

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('£0.00')
    })

    it('should format large amounts with thousands separator', () => {
      expect(formatCurrency(1234.56)).toBe('£1,234.56')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-50)).toBe('-£50.00')
    })
  })

  describe('formatDate', () => {
    it('should format date string in UK format', () => {
      const result = formatDate('2024-03-15')
      expect(result).toBe('15 Mar 2024')
    })

    it('should format Date object', () => {
      const result = formatDate(new Date(2024, 11, 25))
      expect(result).toBe('25 Dec 2024')
    })
  })

  describe('formatDateLong', () => {
    it('should format date with weekday and full month', () => {
      const result = formatDateLong('2024-03-15')
      expect(result).toBe('Friday, 15 March 2024')
    })
  })

  describe('formatMonthYear', () => {
    it('should format month and year', () => {
      const result = formatMonthYear('2024-03-15')
      expect(result).toBe('March 2024')
    })
  })

  describe('generateInvoiceCode', () => {
    it('should generate code from first and last name', () => {
      expect(generateInvoiceCode('John', 'Smith')).toBe('JoSm')
    })

    it('should handle short names', () => {
      expect(generateInvoiceCode('Jo', 'Li')).toBe('JoLi')
    })

    it('should handle single character names', () => {
      expect(generateInvoiceCode('J', 'S')).toBe('JS')
    })

    it('should remove spaces', () => {
      expect(generateInvoiceCode('Mary Jane', 'Watson Smith')).toBe('MaWa')
    })
  })

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with date and code', () => {
      const date = new Date(2024, 10, 1) // November 2024
      expect(generateInvoiceNumber(date, 'JoSm')).toBe('202411-JoSm')
    })

    it('should zero-pad single digit months', () => {
      const date = new Date(2024, 2, 1) // March 2024
      expect(generateInvoiceNumber(date, 'ABC')).toBe('202403-ABC')
    })
  })

  describe('getMonthDateRange', () => {
    it('should return first and last day of month', () => {
      const { start, end } = getMonthDateRange(2024, 3) // March
      
      expect(start.getFullYear()).toBe(2024)
      expect(start.getMonth()).toBe(2) // 0-indexed
      expect(start.getDate()).toBe(1)
      
      expect(end.getFullYear()).toBe(2024)
      expect(end.getMonth()).toBe(2)
      expect(end.getDate()).toBe(31) // March has 31 days
    })

    it('should handle February in leap year', () => {
      const { end } = getMonthDateRange(2024, 2) // February 2024 (leap year)
      expect(end.getDate()).toBe(29)
    })

    it('should handle February in non-leap year', () => {
      const { end } = getMonthDateRange(2023, 2) // February 2023
      expect(end.getDate()).toBe(28)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('no@domain')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
      expect(isValidEmail('spaces in@email.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidPostcode', () => {
    it('should validate UK postcodes', () => {
      expect(isValidPostcode('SW1A 1AA')).toBe(true)
      expect(isValidPostcode('M1 1AE')).toBe(true)
      expect(isValidPostcode('B33 8TH')).toBe(true)
      expect(isValidPostcode('CR2 6XH')).toBe(true)
      expect(isValidPostcode('DN55 1PT')).toBe(true)
      expect(isValidPostcode('EC1A 1BB')).toBe(true)
    })

    it('should validate postcodes without space', () => {
      expect(isValidPostcode('SW1A1AA')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isValidPostcode('sw1a 1aa')).toBe(true)
      expect(isValidPostcode('Sw1A 1aA')).toBe(true)
    })

    it('should reject invalid postcodes', () => {
      expect(isValidPostcode('12345')).toBe(false)
      expect(isValidPostcode('INVALID')).toBe(false)
      expect(isValidPostcode('')).toBe(false)
      expect(isValidPostcode('AAA AAA')).toBe(false)
    })
  })

  describe('capitalise', () => {
    it('should capitalise first letter and lowercase rest', () => {
      expect(capitalise('hello')).toBe('Hello')
      expect(capitalise('HELLO')).toBe('Hello')
      expect(capitalise('hELLO')).toBe('Hello')
    })

    it('should handle single character', () => {
      expect(capitalise('a')).toBe('A')
    })

    it('should handle empty string', () => {
      expect(capitalise('')).toBe('')
    })
  })

  describe('capitaliseWords', () => {
    it('should capitalise each word', () => {
      expect(capitaliseWords('hello world')).toBe('Hello World')
    })

    it('should handle mixed case input', () => {
      expect(capitaliseWords('jOHN sMITH')).toBe('John Smith')
    })

    it('should handle single word', () => {
      expect(capitaliseWords('test')).toBe('Test')
    })
  })

  describe('groupBy', () => {
    it('should group array by specified key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ]
      
      const grouped = groupBy(items, 'category')
      
      expect(grouped).toEqual({
        A: [
          { category: 'A', value: 1 },
          { category: 'A', value: 3 },
        ],
        B: [
          { category: 'B', value: 2 },
        ],
      })
    })

    it('should handle empty array', () => {
      const grouped = groupBy([], 'key' as never)
      expect(grouped).toEqual({})
    })
  })
})
