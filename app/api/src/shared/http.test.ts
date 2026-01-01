import { describe, it, expect } from 'vitest'
import {
  withSecurityHeaders,
  jsonResponse,
  successResponse,
  createdResponse,
  errorResponse,
  unauthorisedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from './http'

describe('HTTP Response Utilities', () => {
  describe('withSecurityHeaders', () => {
    it('should add security headers to response', () => {
      const response = withSecurityHeaders({ status: 200 })
      
      expect(response.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      })
    })

    it('should preserve existing headers', () => {
      const response = withSecurityHeaders({
        status: 200,
        headers: { 'X-Custom-Header': 'test-value' },
      })
      
      expect(response.headers).toMatchObject({
        'X-Custom-Header': 'test-value',
        'Content-Type': 'application/json',
      })
    })

    it('should preserve status code', () => {
      const response = withSecurityHeaders({ status: 404 })
      expect(response.status).toBe(404)
    })
  })

  describe('jsonResponse', () => {
    it('should create response with status and body', () => {
      const response = jsonResponse(200, { message: 'Hello' })
      
      expect(response.status).toBe(200)
      expect(response.jsonBody).toEqual({ message: 'Hello' })
    })

    it('should include security headers', () => {
      const response = jsonResponse(200, {})
      
      expect(response.headers).toMatchObject({
        'X-Content-Type-Options': 'nosniff',
      })
    })
  })

  describe('successResponse', () => {
    it('should return 200 status with success true', () => {
      const response = successResponse({ id: '123' })
      
      expect(response.status).toBe(200)
      expect(response.jsonBody).toEqual({
        success: true,
        data: { id: '123' },
        message: undefined,
      })
    })

    it('should include optional message', () => {
      const response = successResponse({ id: '123' }, 'Operation successful')
      
      expect(response.jsonBody).toMatchObject({
        message: 'Operation successful',
      })
    })
  })

  describe('createdResponse', () => {
    it('should return 201 status', () => {
      const response = createdResponse({ id: 'new-123' })
      
      expect(response.status).toBe(201)
      expect(response.jsonBody).toEqual({
        success: true,
        data: { id: 'new-123' },
        message: undefined,
      })
    })
  })

  describe('errorResponse', () => {
    it('should return error with status and message', () => {
      const response = errorResponse(400, 'Bad request')
      
      expect(response.status).toBe(400)
      expect(response.jsonBody).toEqual({
        success: false,
        message: 'Bad request',
        error: undefined,
      })
    })

    it('should include optional error details', () => {
      const response = errorResponse(500, 'Server error', 'INTERNAL_ERROR')
      
      expect(response.jsonBody).toMatchObject({
        error: 'INTERNAL_ERROR',
      })
    })
  })

  describe('convenience error responses', () => {
    it('unauthorisedResponse should return 401', () => {
      const response = unauthorisedResponse()
      
      expect(response.status).toBe(401)
      expect(response.jsonBody).toMatchObject({
        success: false,
        message: 'Unauthorised',
      })
    })

    it('unauthorisedResponse should accept custom message', () => {
      const response = unauthorisedResponse('Token expired')
      
      expect(response.jsonBody).toMatchObject({
        message: 'Token expired',
      })
    })

    it('forbiddenResponse should return 403', () => {
      const response = forbiddenResponse()
      
      expect(response.status).toBe(403)
      expect(response.jsonBody).toMatchObject({
        message: 'Forbidden',
      })
    })

    it('notFoundResponse should return 404', () => {
      const response = notFoundResponse()
      
      expect(response.status).toBe(404)
      expect(response.jsonBody).toMatchObject({
        message: 'Not found',
      })
    })

    it('notFoundResponse should accept custom message', () => {
      const response = notFoundResponse('Client not found')
      
      expect(response.jsonBody).toMatchObject({
        message: 'Client not found',
      })
    })

    it('badRequestResponse should return 400', () => {
      const response = badRequestResponse('Invalid email format')
      
      expect(response.status).toBe(400)
      expect(response.jsonBody).toMatchObject({
        message: 'Invalid email format',
      })
    })

    it('serverErrorResponse should return 500', () => {
      const response = serverErrorResponse()
      
      expect(response.status).toBe(500)
      expect(response.jsonBody).toMatchObject({
        message: 'Internal server error',
      })
    })
  })
})
