/**
 * Input Validation Utilities
 * 
 * Provides type-safe validation for API request data.
 * All validators return either the validated value or throw a ValidationError.
 */

export class ValidationError extends Error {
  public readonly field?: string
  public readonly code: string

  constructor(message: string, field?: string, code = 'VALIDATION_ERROR') {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.code = code
  }
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Array<{ field: string; message: string }>
}

// ============================================
// String Validators
// ============================================

/**
 * Validate that a value is a non-empty string
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; trim?: boolean } = {}
): string {
  const { minLength = 1, maxLength = 1000, trim = true } = options

  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName)
  }

  const result = trim ? value.trim() : value

  if (result.length < minLength) {
    throw new ValidationError(
      minLength === 1 
        ? `${fieldName} is required` 
        : `${fieldName} must be at least ${minLength} characters`,
      fieldName
    )
  }

  if (result.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`, fieldName)
  }

  return result
}

/**
 * Validate an optional string (can be undefined/null, but if present must be valid)
 */
export function validateOptionalString(
  value: unknown,
  fieldName: string,
  options: { maxLength?: number; trim?: boolean } = {}
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const { maxLength = 1000, trim = true } = options

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName)
  }

  const result = trim ? value.trim() : value

  if (result.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`, fieldName)
  }

  return result || undefined
}

// ============================================
// Email Validator
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: unknown, fieldName = 'Email'): string {
  const email = validateRequiredString(value, fieldName, { maxLength: 254 })
  
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(`${fieldName} is not a valid email address`, fieldName)
  }

  return email.toLowerCase()
}

export function validateOptionalEmail(value: unknown, fieldName = 'Email'): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return validateEmail(value, fieldName)
}

// ============================================
// Number Validators
// ============================================

export function validateRequiredNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const { min, max, integer = false } = options

  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName)
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be a whole number`, fieldName)
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName)
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName)
  }

  return num
}

export function validateOptionalNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return validateRequiredNumber(value, fieldName, options)
}

// ============================================
// Boolean Validator
// ============================================

export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false

  throw new ValidationError(`${fieldName} must be a boolean`, fieldName)
}

export function validateOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  return validateBoolean(value, fieldName)
}

// ============================================
// Date Validators
// ============================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function validateDateString(value: unknown, fieldName: string): string {
  const dateStr = validateRequiredString(value, fieldName)

  if (!DATE_REGEX.test(dateStr)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format`, fieldName)
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`, fieldName)
  }

  return dateStr
}

export function validateOptionalDateString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return validateDateString(value, fieldName)
}

// ============================================
// Enum Validator
// ============================================

export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  const str = validateRequiredString(value, fieldName)

  if (!allowedValues.includes(str as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    )
  }

  return str as T
}

export function validateOptionalEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return validateEnum(value, fieldName, allowedValues)
}

// ============================================
// Array Validators
// ============================================

export function validateArray<T>(
  value: unknown,
  fieldName: string,
  itemValidator: (item: unknown, index: number) => T,
  options: { minLength?: number; maxLength?: number } = {}
): T[] {
  const { minLength = 0, maxLength = 100 } = options

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName)
  }

  if (value.length < minLength) {
    throw new ValidationError(`${fieldName} must have at least ${minLength} items`, fieldName)
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} must have at most ${maxLength} items`, fieldName)
  }

  return value.map((item, index) => itemValidator(item, index))
}

export function validateOptionalArray<T>(
  value: unknown,
  fieldName: string,
  itemValidator: (item: unknown, index: number) => T,
  options: { maxLength?: number } = {}
): T[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  return validateArray(value, fieldName, itemValidator, options)
}

// ============================================
// UK-Specific Validators
// ============================================

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

export function validateUKPostcode(value: unknown, fieldName = 'Postcode'): string {
  const postcode = validateRequiredString(value, fieldName, { maxLength: 10 })

  if (!UK_POSTCODE_REGEX.test(postcode)) {
    throw new ValidationError(`${fieldName} is not a valid UK postcode`, fieldName)
  }

  return postcode.toUpperCase()
}

export function validateOptionalUKPostcode(value: unknown, fieldName = 'Postcode'): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return validateUKPostcode(value, fieldName)
}

// UK phone regex - accepts mobile and landline formats
// More lenient to handle various formatting styles
const UK_PHONE_REGEX = /^(?:(?:\+44\s?|0)[\d\s\-\(\)]{9,14})$/

export function validateOptionalUKPhone(value: unknown, fieldName = 'Phone number'): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const phone = validateRequiredString(value, fieldName, { maxLength: 20 })
  
  // Check it starts with UK prefix and has roughly right number of digits
  if (!UK_PHONE_REGEX.test(phone)) {
    throw new ValidationError(`${fieldName} is not a valid UK phone number`, fieldName)
  }

  // Verify we have enough actual digits (10-11 after country code)
  const digitCount = phone.replace(/\D/g, '').length
  if (digitCount < 10 || digitCount > 13) {
    throw new ValidationError(`${fieldName} is not a valid UK phone number`, fieldName)
  }

  return phone
}

// ============================================
// UUID Validator
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateUUID(value: unknown, fieldName = 'ID'): string {
  const id = validateRequiredString(value, fieldName, { maxLength: 36 })

  if (!UUID_REGEX.test(id)) {
    throw new ValidationError(`${fieldName} is not a valid ID`, fieldName)
  }

  return id.toLowerCase()
}

// ============================================
// Password Validator
// ============================================

export function validatePassword(value: unknown, fieldName = 'Password'): string {
  const password = validateRequiredString(value, fieldName, { 
    minLength: 8, 
    maxLength: 128,
    trim: false // Don't trim passwords
  })

  // Check for at least one letter and one number
  if (!/[a-zA-Z]/.test(password)) {
    throw new ValidationError(`${fieldName} must contain at least one letter`, fieldName)
  }

  if (!/\d/.test(password)) {
    throw new ValidationError(`${fieldName} must contain at least one number`, fieldName)
  }

  return password
}

// ============================================
// Sanitisation Helpers
// ============================================

/**
 * Remove potentially dangerous characters from strings
 * Helps prevent XSS and injection attacks
 */
export function sanitiseString(value: string): string {
  return value
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Sanitise HTML - strip all HTML tags
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// ============================================
// Request Body Validation Helper
// ============================================

/**
 * Safely parse JSON body and validate it's an object
 */
export async function parseRequestBody<T extends Record<string, unknown>>(
  request: { json: () => Promise<unknown> }
): Promise<T> {
  try {
    const body = await request.json()
    
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ValidationError('Request body must be a JSON object')
    }

    return body as T
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid JSON in request body')
  }
}
