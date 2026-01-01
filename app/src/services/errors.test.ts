import { describe, it, expect } from 'vitest'
import { ApiError, isApiError, getErrorMessage } from './errors'

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create error with message and status code', () => {
      const error = new ApiError('Not found', 404)
      
      expect(error.message).toBe('Not found')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('ApiError')
    })

    it('should include optional error code', () => {
      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR')
      
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should set timestamp', () => {
      const before = new Date()
      const error = new ApiError('Test', 500)
      const after = new Date()
      
      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('status code helpers', () => {
    it('isUnauthorised should return true for 401', () => {
      expect(new ApiError('Unauthorised', 401).isUnauthorised).toBe(true)
      expect(new ApiError('Other', 400).isUnauthorised).toBe(false)
    })

    it('isForbidden should return true for 403', () => {
      expect(new ApiError('Forbidden', 403).isForbidden).toBe(true)
      expect(new ApiError('Other', 401).isForbidden).toBe(false)
    })

    it('isNotFound should return true for 404', () => {
      expect(new ApiError('Not found', 404).isNotFound).toBe(true)
      expect(new ApiError('Other', 400).isNotFound).toBe(false)
    })

    it('isRateLimited should return true for 429', () => {
      expect(new ApiError('Rate limited', 429).isRateLimited).toBe(true)
      expect(new ApiError('Other', 400).isRateLimited).toBe(false)
    })

    it('isValidationError should return true for 400', () => {
      expect(new ApiError('Bad request', 400).isValidationError).toBe(true)
      expect(new ApiError('Other', 401).isValidationError).toBe(false)
    })

    it('isServerError should return true for 5xx', () => {
      expect(new ApiError('Server error', 500).isServerError).toBe(true)
      expect(new ApiError('Gateway error', 502).isServerError).toBe(true)
      expect(new ApiError('Service unavailable', 503).isServerError).toBe(true)
      expect(new ApiError('Client error', 400).isServerError).toBe(false)
    })

    it('isClientError should return true for 4xx', () => {
      expect(new ApiError('Bad request', 400).isClientError).toBe(true)
      expect(new ApiError('Not found', 404).isClientError).toBe(true)
      expect(new ApiError('Server error', 500).isClientError).toBe(false)
    })
  })

  describe('userMessage', () => {
    it('should return friendly message for rate limit', () => {
      const error = new ApiError('Rate limited', 429)
      expect(error.userMessage).toBe('Too many requests. Please wait a moment and try again.')
    })

    it('should return friendly message for unauthorised', () => {
      const error = new ApiError('Token expired', 401)
      expect(error.userMessage).toBe('Your session has expired. Please sign in again.')
    })

    it('should return friendly message for forbidden', () => {
      const error = new ApiError('Access denied', 403)
      expect(error.userMessage).toBe('You do not have permission to perform this action.')
    })

    it('should return friendly message for not found', () => {
      const error = new ApiError('Resource missing', 404)
      expect(error.userMessage).toBe('The requested item could not be found.')
    })

    it('should return friendly message for server errors', () => {
      const error = new ApiError('Database connection failed', 500)
      expect(error.userMessage).toBe('Something went wrong on our end. Please try again later.')
    })

    it('should return original message for other errors', () => {
      const error = new ApiError('Custom validation message', 400)
      expect(error.userMessage).toBe('Custom validation message')
    })
  })

  describe('toJSON', () => {
    it('should convert error to plain object', () => {
      const error = new ApiError('Test error', 400, 'TEST_CODE')
      const json = error.toJSON()
      
      expect(json).toEqual({
        name: 'ApiError',
        message: 'Test error',
        statusCode: 400,
        code: 'TEST_CODE',
        timestamp: expect.any(String),
      })
    })

    it('should format timestamp as ISO string', () => {
      const error = new ApiError('Test', 500)
      const json = error.toJSON()
      
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})

describe('isApiError', () => {
  it('should return true for ApiError instances', () => {
    const error = new ApiError('Test', 400)
    expect(isApiError(error)).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('Test')
    expect(isApiError(error)).toBe(false)
  })

  it('should return false for plain objects', () => {
    const obj = { message: 'Test', statusCode: 400 }
    expect(isApiError(obj)).toBe(false)
  })

  it('should return false for null and undefined', () => {
    expect(isApiError(null)).toBe(false)
    expect(isApiError(undefined)).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('should return userMessage for ApiError', () => {
    const error = new ApiError('Token expired', 401)
    expect(getErrorMessage(error)).toBe('Your session has expired. Please sign in again.')
  })

  it('should return message for regular Error', () => {
    const error = new Error('Something went wrong')
    expect(getErrorMessage(error)).toBe('Something went wrong')
  })

  it('should return string directly', () => {
    expect(getErrorMessage('Error message string')).toBe('Error message string')
  })

  it('should return default message for unknown types', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred')
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
    expect(getErrorMessage(123)).toBe('An unexpected error occurred')
  })
})
