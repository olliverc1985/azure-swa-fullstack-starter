import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getContainer, CONTAINERS } from '../shared/database'
import { authenticateRequest, requireAdmin } from '../shared/auth'
import {
  successResponse,
  badRequestResponse,
  unauthorisedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '../shared/http'

// Settings document structure - single document with id 'app-settings'
export interface AppSettings {
  id: string // Always 'app-settings'
  business: {
    name: string
    addressLine1: string
    addressLine2?: string
    city: string
    county: string
    postcode: string
  }
  bank: {
    accountName: string
    bankName: string
    sortCode: string
    accountNumber: string
  }
  rates: {
    standard: number
    reduced: number
  }
  updatedAt: string
  updatedBy: string
}

// Default settings with placeholder values - configure via Settings page
const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  business: {
    name: 'Business Name - Please Configure',
    addressLine1: 'Address Line 1',
    city: 'City',
    county: 'County',
    postcode: 'POSTCODE',
  },
  bank: {
    accountName: 'Account Name - Please Configure',
    bankName: 'Bank Name',
    sortCode: '00-00-00',
    accountNumber: '00000000',
  },
  rates: {
    standard: 40,
    reduced: 36,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
}

// GET /api/settings - Get app settings (Admin only - contains sensitive bank details)
export async function getSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('GET /api/settings')

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Admin access required') : unauthorisedResponse()
  }

  try {
    const container = getContainer(CONTAINERS.SETTINGS)
    
    // Try to read the settings document
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: 'app-settings' }]
      })
      .fetchAll()

    if (resources.length === 0) {
      // Return defaults if no settings exist yet
      return successResponse(DEFAULT_SETTINGS)
    }

    return successResponse(resources[0])
  } catch (error: any) {
    // If container doesn't exist yet, return defaults
    if (error?.code === 404 || error?.code === 'NotFound') {
      return successResponse(DEFAULT_SETTINGS)
    }
    context.error('Failed to fetch settings:', error)
    return serverErrorResponse('Failed to fetch settings')
  }
}

// PUT /api/settings - Update app settings (Admin only)
export async function updateSettings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.info('PUT /api/settings')

  const auth = await authenticateRequest(request, context)
  if (!auth || !requireAdmin(auth)) {
    return auth ? forbiddenResponse('Admin access required') : unauthorisedResponse()
  }

  try {
    const body = await request.json() as Partial<AppSettings>
    const container = getContainer(CONTAINERS.SETTINGS)

    // Get existing settings or use defaults
    let existing: AppSettings = DEFAULT_SETTINGS
    try {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: 'app-settings' }]
        })
        .fetchAll()
      
      if (resources.length > 0) {
        existing = resources[0] as AppSettings
      }
    } catch (e: any) {
      // Container might not exist yet, use defaults
      if (e?.code !== 404 && e?.code !== 'NotFound') {
        throw e
      }
    }

    // Sanitise and merge updates
    const updated: AppSettings = {
      id: 'app-settings',
      business: {
        name: body.business?.name?.trim() || existing.business.name,
        addressLine1: body.business?.addressLine1?.trim() || existing.business.addressLine1,
        addressLine2: body.business?.addressLine2?.trim() || existing.business.addressLine2,
        city: body.business?.city?.trim() || existing.business.city,
        county: body.business?.county?.trim() || existing.business.county,
        postcode: body.business?.postcode?.trim().toUpperCase() || existing.business.postcode,
      },
      bank: {
        accountName: body.bank?.accountName?.trim() || existing.bank.accountName,
        bankName: body.bank?.bankName?.trim() || existing.bank.bankName,
        sortCode: body.bank?.sortCode?.trim() || existing.bank.sortCode,
        accountNumber: body.bank?.accountNumber?.trim() || existing.bank.accountNumber,
      },
      rates: {
        standard: body.rates?.standard ?? existing.rates.standard,
        reduced: body.rates?.reduced ?? existing.rates.reduced,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: auth.email,
    }

    // Upsert the settings document
    await container.items.upsert(updated)

    context.info(`Settings updated by ${auth.email}`)
    return successResponse(updated)
  } catch (error) {
    context.error('Failed to update settings:', error)
    return serverErrorResponse('Failed to update settings')
  }
}

// Register routes
app.http('settings-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'settings',
  handler: getSettings,
})

app.http('settings-update', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'settings',
  handler: updateSettings,
})
