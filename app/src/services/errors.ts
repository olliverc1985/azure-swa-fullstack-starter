/**
 * Custom API Error class for typed error handling
 * Provides semantic error checking and maintains HTTP status information
 */
export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code?: string
  public readonly timestamp: Date

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.timestamp = new Date()

    // Maintains proper stack trace for where the error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /** Check if error is an authentication failure (401) */
  get isUnauthorised(): boolean {
    return this.statusCode === 401
  }

  /** Check if error is a permission denied error (403) */
  get isForbidden(): boolean {
    return this.statusCode === 403
  }

  /** Check if error is a not found error (404) */
  get isNotFound(): boolean {
    return this.statusCode === 404
  }

  /** Check if error is a rate limit error (429) */
  get isRateLimited(): boolean {
    return this.statusCode === 429
  }

  /** Check if error is a validation error (400) */
  get isValidationError(): boolean {
    return this.statusCode === 400
  }

  /** Check if error is a server error (5xx) */
  get isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600
  }

  /** Check if error is a client error (4xx) */
  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500
  }

  /**
   * Get a user-friendly error message
   * Maps common HTTP errors to readable messages
   */
  get userMessage(): string {
    if (this.isRateLimited) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (this.isUnauthorised) {
      return 'Your session has expired. Please sign in again.'
    }
    if (this.isForbidden) {
      return 'You do not have permission to perform this action.'
    }
    if (this.isNotFound) {
      return 'The requested item could not be found.'
    }
    if (this.isServerError) {
      return 'Something went wrong on our end. Please try again later.'
    }
    return this.message
  }

  /** Convert to a plain object for logging */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
    }
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Extract a user-friendly message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.userMessage
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

