import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validateRequiredString,
  validateOptionalString,
  validateEmail,
  validateOptionalEmail,
  validateRequiredNumber,
  validateOptionalNumber,
  validateBoolean,
  validateDateString,
  validateOptionalDateString,
  validateEnum,
  validateArray,
  validateUKPostcode,
  validateOptionalUKPostcode,
  validateOptionalUKPhone,
  validateUUID,
  validatePassword,
  sanitiseString,
  stripHtml,
} from './validation'

describe('Validation Utilities', () => {
  describe('ValidationError', () => {
    it('should create error with message and field', () => {
      const error = new ValidationError('Invalid value', 'email')
      
      expect(error.message).toBe('Invalid value')
      expect(error.field).toBe('email')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
    })
  })

  describe('validateRequiredString', () => {
    it('should return trimmed string for valid input', () => {
      expect(validateRequiredString('  hello  ', 'name')).toBe('hello')
    })

    it('should throw for undefined', () => {
      expect(() => validateRequiredString(undefined, 'name'))
        .toThrow('name is required')
    })

    it('should throw for null', () => {
      expect(() => validateRequiredString(null, 'name'))
        .toThrow('name is required')
    })

    it('should throw for empty string', () => {
      expect(() => validateRequiredString('', 'name'))
        .toThrow('name is required')
    })

    it('should throw for whitespace only', () => {
      expect(() => validateRequiredString('   ', 'name'))
        .toThrow('name is required')
    })

    it('should throw for non-string', () => {
      expect(() => validateRequiredString(123, 'name'))
        .toThrow('name must be a string')
    })

    it('should enforce minLength', () => {
      expect(() => validateRequiredString('ab', 'name', { minLength: 3 }))
        .toThrow('name must be at least 3 characters')
    })

    it('should enforce maxLength', () => {
      expect(() => validateRequiredString('abcdef', 'name', { maxLength: 5 }))
        .toThrow('name must be at most 5 characters')
    })
  })

  describe('validateOptionalString', () => {
    it('should return undefined for null/undefined', () => {
      expect(validateOptionalString(undefined, 'name')).toBeUndefined()
      expect(validateOptionalString(null, 'name')).toBeUndefined()
      expect(validateOptionalString('', 'name')).toBeUndefined()
    })

    it('should return trimmed string for valid input', () => {
      expect(validateOptionalString('  hello  ', 'name')).toBe('hello')
    })
  })

  describe('validateEmail', () => {
    it('should return lowercase email for valid input', () => {
      expect(validateEmail('Test@Example.COM', 'Email')).toBe('test@example.com')
    })

    it('should accept valid email formats', () => {
      expect(validateEmail('user@domain.com')).toBe('user@domain.com')
      expect(validateEmail('user.name@domain.co.uk')).toBe('user.name@domain.co.uk')
      expect(validateEmail('user+tag@domain.org')).toBe('user+tag@domain.org')
    })

    it('should reject invalid email formats', () => {
      expect(() => validateEmail('invalid')).toThrow('not a valid email')
      expect(() => validateEmail('no@domain')).toThrow('not a valid email')
      expect(() => validateEmail('@nodomain.com')).toThrow('not a valid email')
    })
  })

  describe('validateOptionalEmail', () => {
    it('should return undefined for empty values', () => {
      expect(validateOptionalEmail(undefined)).toBeUndefined()
      expect(validateOptionalEmail(null)).toBeUndefined()
      expect(validateOptionalEmail('')).toBeUndefined()
    })

    it('should validate present email', () => {
      expect(validateOptionalEmail('test@example.com')).toBe('test@example.com')
    })
  })

  describe('validateRequiredNumber', () => {
    it('should return number for valid input', () => {
      expect(validateRequiredNumber(42, 'amount')).toBe(42)
      expect(validateRequiredNumber(3.14, 'rate')).toBe(3.14)
    })

    it('should parse string numbers', () => {
      expect(validateRequiredNumber('42', 'amount')).toBe(42)
    })

    it('should throw for non-numbers', () => {
      expect(() => validateRequiredNumber('abc', 'amount'))
        .toThrow('amount must be a number')
    })

    it('should enforce min value', () => {
      expect(() => validateRequiredNumber(5, 'amount', { min: 10 }))
        .toThrow('amount must be at least 10')
    })

    it('should enforce max value', () => {
      expect(() => validateRequiredNumber(100, 'amount', { max: 50 }))
        .toThrow('amount must be at most 50')
    })

    it('should enforce integer constraint', () => {
      expect(() => validateRequiredNumber(3.14, 'count', { integer: true }))
        .toThrow('count must be a whole number')
    })
  })

  describe('validateOptionalNumber', () => {
    it('should return undefined for empty values', () => {
      expect(validateOptionalNumber(undefined, 'amount')).toBeUndefined()
      expect(validateOptionalNumber(null, 'amount')).toBeUndefined()
      expect(validateOptionalNumber('', 'amount')).toBeUndefined()
    })

    it('should validate present number', () => {
      expect(validateOptionalNumber(42, 'amount')).toBe(42)
    })
  })

  describe('validateBoolean', () => {
    it('should return boolean for boolean input', () => {
      expect(validateBoolean(true, 'active')).toBe(true)
      expect(validateBoolean(false, 'active')).toBe(false)
    })

    it('should parse string booleans', () => {
      expect(validateBoolean('true', 'active')).toBe(true)
      expect(validateBoolean('false', 'active')).toBe(false)
      expect(validateBoolean('1', 'active')).toBe(true)
      expect(validateBoolean('0', 'active')).toBe(false)
    })

    it('should throw for invalid values', () => {
      expect(() => validateBoolean('yes', 'active'))
        .toThrow('active must be a boolean')
    })
  })

  describe('validateDateString', () => {
    it('should accept valid YYYY-MM-DD dates', () => {
      expect(validateDateString('2024-03-15', 'date')).toBe('2024-03-15')
    })

    it('should reject invalid formats', () => {
      expect(() => validateDateString('15-03-2024', 'date'))
        .toThrow('must be in YYYY-MM-DD format')
      expect(() => validateDateString('2024/03/15', 'date'))
        .toThrow('must be in YYYY-MM-DD format')
    })

    it('should reject invalid dates', () => {
      expect(() => validateDateString('2024-13-45', 'date'))
        .toThrow('not a valid date')
    })
  })

  describe('validateOptionalDateString', () => {
    it('should return undefined for empty values', () => {
      expect(validateOptionalDateString(undefined, 'date')).toBeUndefined()
      expect(validateOptionalDateString('', 'date')).toBeUndefined()
    })

    it('should validate present date', () => {
      expect(validateOptionalDateString('2024-03-15', 'date')).toBe('2024-03-15')
    })
  })

  describe('validateEnum', () => {
    const STATUSES = ['draft', 'sent', 'paid'] as const

    it('should accept valid enum values', () => {
      expect(validateEnum('draft', 'status', STATUSES)).toBe('draft')
      expect(validateEnum('sent', 'status', STATUSES)).toBe('sent')
    })

    it('should reject invalid values', () => {
      expect(() => validateEnum('invalid', 'status', STATUSES))
        .toThrow('status must be one of: draft, sent, paid')
    })
  })

  describe('validateArray', () => {
    it('should validate array of strings', () => {
      const result = validateArray(
        ['a', 'b', 'c'],
        'items',
        (item) => validateRequiredString(item, 'item')
      )
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should throw for non-array', () => {
      expect(() => validateArray('not array', 'items', (x) => x))
        .toThrow('items must be an array')
    })

    it('should enforce maxLength', () => {
      expect(() => validateArray([1, 2, 3], 'items', (x) => x, { maxLength: 2 }))
        .toThrow('items must have at most 2 items')
    })
  })

  describe('validateUKPostcode', () => {
    it('should accept valid UK postcodes', () => {
      expect(validateUKPostcode('SW1A 1AA')).toBe('SW1A 1AA')
      expect(validateUKPostcode('M1 1AE')).toBe('M1 1AE')
      expect(validateUKPostcode('B33 8TH')).toBe('B33 8TH')
      expect(validateUKPostcode('ec1a1bb')).toBe('EC1A1BB')
    })

    it('should reject invalid postcodes', () => {
      expect(() => validateUKPostcode('12345'))
        .toThrow('not a valid UK postcode')
      expect(() => validateUKPostcode('INVALID'))
        .toThrow('not a valid UK postcode')
    })
  })

  describe('validateOptionalUKPostcode', () => {
    it('should return undefined for empty values', () => {
      expect(validateOptionalUKPostcode(undefined)).toBeUndefined()
      expect(validateOptionalUKPostcode('')).toBeUndefined()
    })

    it('should validate present postcode', () => {
      expect(validateOptionalUKPostcode('SW1A 1AA')).toBe('SW1A 1AA')
    })
  })

  describe('validateOptionalUKPhone', () => {
    it('should accept valid UK mobile numbers', () => {
      expect(validateOptionalUKPhone('07123 456789')).toBe('07123 456789')
      expect(validateOptionalUKPhone('+44 7123 456789')).toBe('+44 7123 456789')
    })

    it('should accept valid UK landline numbers', () => {
      expect(validateOptionalUKPhone('0208 123 4567')).toBe('0208 123 4567')
      expect(validateOptionalUKPhone('01161 456 7890')).toBe('01161 456 7890')
    })

    it('should return undefined for empty values', () => {
      expect(validateOptionalUKPhone(undefined)).toBeUndefined()
      expect(validateOptionalUKPhone('')).toBeUndefined()
    })

    it('should reject invalid phone numbers', () => {
      expect(() => validateOptionalUKPhone('123')).toThrow('not a valid UK phone number')
      expect(() => validateOptionalUKPhone('not a phone')).toThrow('not a valid UK phone number')
    })
  })

  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000'))
        .toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('should lowercase UUIDs', () => {
      expect(validateUUID('550E8400-E29B-41D4-A716-446655440000'))
        .toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('should reject invalid UUIDs', () => {
      expect(() => validateUUID('not-a-uuid'))
        .toThrow('not a valid ID')
    })
  })

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(validatePassword('Password123')).toBe('Password123')
      expect(validatePassword('SecurePass1!')).toBe('SecurePass1!')
    })

    it('should reject short passwords', () => {
      expect(() => validatePassword('Pass1'))
        .toThrow('must be at least 8 characters')
    })

    it('should require at least one letter', () => {
      expect(() => validatePassword('12345678'))
        .toThrow('must contain at least one letter')
    })

    it('should require at least one number', () => {
      expect(() => validatePassword('PasswordOnly'))
        .toThrow('must contain at least one number')
    })

    it('should not trim passwords', () => {
      expect(validatePassword('Password 123')).toBe('Password 123')
    })
  })

  describe('sanitiseString', () => {
    it('should remove angle brackets', () => {
      expect(sanitiseString('<script>alert()</script>'))
        .toBe('scriptalert()/script')
    })

    it('should remove javascript: protocol', () => {
      expect(sanitiseString('javascript:alert()'))
        .toBe('alert()')
    })

    it('should remove event handlers', () => {
      expect(sanitiseString('onclick=alert()')).toBe('alert()')
      expect(sanitiseString('onmouseover = doSomething()')).toBe('doSomething()')
    })

    it('should trim whitespace', () => {
      expect(sanitiseString('  hello  ')).toBe('hello')
    })
  })

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>'))
        .toBe('Hello World')
    })

    it('should handle self-closing tags', () => {
      expect(stripHtml('Line 1<br/>Line 2')).toBe('Line 1Line 2')
    })

    it('should preserve plain text', () => {
      expect(stripHtml('No HTML here')).toBe('No HTML here')
    })
  })
})
