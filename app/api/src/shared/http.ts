import { HttpResponseInit } from '@azure/functions'

export function withSecurityHeaders(response: HttpResponseInit): HttpResponseInit {
  return {
    ...response,
    headers: {
      ...response.headers,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  }
}

export function jsonResponse(status: number, body: unknown): HttpResponseInit {
  return withSecurityHeaders({
    status,
    jsonBody: body,
  })
}

export function successResponse<T>(data: T, message?: string): HttpResponseInit {
  return jsonResponse(200, { success: true, data, message })
}

export function createdResponse<T>(data: T, message?: string): HttpResponseInit {
  return jsonResponse(201, { success: true, data, message })
}

export function errorResponse(status: number, message: string, error?: string): HttpResponseInit {
  return jsonResponse(status, { success: false, message, error })
}

export function unauthorisedResponse(message = 'Unauthorised'): HttpResponseInit {
  return errorResponse(401, message)
}

export function forbiddenResponse(message = 'Forbidden'): HttpResponseInit {
  return errorResponse(403, message)
}

export function notFoundResponse(message = 'Not found'): HttpResponseInit {
  return errorResponse(404, message)
}

export function badRequestResponse(message: string): HttpResponseInit {
  return errorResponse(400, message)
}

export function serverErrorResponse(message = 'Internal server error'): HttpResponseInit {
  return errorResponse(500, message)
}


