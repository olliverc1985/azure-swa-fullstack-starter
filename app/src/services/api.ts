import { getAuthToken, TOKEN_KEY, USER_KEY } from '@/lib/authStorage'
import { ApiError } from './errors'
import type { 
  ApiResponse, 
  Client, 
  RegisterEntry, 
  Invoice, 
  User,
  AppSettings,
  DashboardStats,
  TrendsResponse,
  AnalyticsResponse,
  ComparisonData,
  ClientActivityResponse,
  InvoiceStatusBreakdown,
  IncidentReport,
  ClientNote,
  StaffMember,
  StaffRegisterEntry,
  StaffReconciliation,
  ClientRegistration,
  ClientRegistrationFormData,
} from '@/types'

const API_BASE = '/api'

/**
 * Clear auth state and redirect to login
 * Used when API returns 401 (session expired/invalid)
 */
function handleAuthExpiry(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  // Only redirect if not already on login page
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login'
  }
}

/**
 * Enhanced fetch wrapper with authentication and typed error handling
 * - Automatically attaches auth token
 * - Throws ApiError with status codes for proper error handling
 * - Handles 401 responses by clearing auth and redirecting
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  
  if (token) {
    // Use custom header to bypass Azure SWA's built-in auth interception
    headers['X-App-Auth'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed' }))
    
    // Handle auth expiry - redirect to login
    if (response.status === 401) {
      handleAuthExpiry()
    }
    
    throw new ApiError(
      errorBody.message || `Request failed (${response.status})`,
      response.status,
      errorBody.code
    )
  }
  
  return response.json()
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetchWithAuth<ApiResponse<DashboardStats>>('/dashboard/stats')
  return response.data || {
    totalClients: 0,
    activeClients: 0,
    sessionsThisMonth: 0,
    revenueThisMonth: 0,
    unpaidInvoices: 0,
    unpaidAmount: 0,
  }
}

export async function getDashboardTrends(months: number = 12): Promise<TrendsResponse> {
  const response = await fetchWithAuth<ApiResponse<TrendsResponse>>(`/dashboard/trends?months=${months}`)
  return response.data || {
    monthly: [],
    summary: {
      totalRevenue: 0,
      totalSessions: 0,
      averageMonthlyRevenue: 0,
      averageMonthlySessions: 0,
      growthRate: 0,
    },
  }
}

export async function getDashboardAnalytics(
  type: 'revenue-by-day' | 'attendance-by-day' | 'client-activity' | 'comparison',
  params?: Record<string, string | number>
): Promise<AnalyticsResponse> {
  const searchParams = new URLSearchParams({ type })
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })
  }
  const response = await fetchWithAuth<ApiResponse<AnalyticsResponse>>(`/dashboard/analytics?${searchParams}`)
  return response.data || {}
}

export async function getComparisonData(period: 'month' | 'week' = 'month'): Promise<ComparisonData> {
  const response = await fetchWithAuth<ApiResponse<ComparisonData>>(`/dashboard/analytics?type=comparison&period=${period}`)
  return response.data || {
    current: { period: '', sessions: 0, revenue: 0, clients: 0 },
    previous: { period: '', sessions: 0, revenue: 0, clients: 0 },
    change: { sessions: 0, sessionsPercent: 0, revenue: 0, revenuePercent: 0, clients: 0, clientsPercent: 0 },
  }
}

export async function getClientActivity(limit: number = 10, inactiveDays: number = 14): Promise<ClientActivityResponse> {
  const response = await fetchWithAuth<ApiResponse<ClientActivityResponse>>(
    `/dashboard/analytics?type=client-activity&limit=${limit}&inactiveDays=${inactiveDays}`
  )
  return response.data || {
    topAttendees: [],
    atRiskClients: [],
    totalActiveClients: 0,
    inactiveDaysThreshold: inactiveDays,
  }
}

export async function getInvoiceStatusBreakdown(): Promise<InvoiceStatusBreakdown> {
  const response = await fetchWithAuth<ApiResponse<InvoiceStatusBreakdown>>('/dashboard/invoice-status')
  return response.data || {
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    totalOutstanding: 0,
  }
}

// Clients
export async function getClients(): Promise<Client[]> {
  const response = await fetchWithAuth<ApiResponse<Client[]>>('/clients')
  return response.data || []
}

export async function getClient(id: string): Promise<Client> {
  const response = await fetchWithAuth<ApiResponse<Client>>(`/clients/${id}`)
  if (!response.data) throw new Error('Client not found')
  return response.data
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'concatName' | 'isActive'>): Promise<Client> {
  const response = await fetchWithAuth<ApiResponse<Client>>('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create client')
  return response.data
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const response = await fetchWithAuth<ApiResponse<Client>>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update client')
  return response.data
}

export async function deleteClient(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/clients/${id}`, {
    method: 'DELETE',
  })
}

// Register
export async function getRegisterByDate(date: string): Promise<RegisterEntry[]> {
  const response = await fetchWithAuth<ApiResponse<RegisterEntry[]>>(`/register?date=${date}`)
  return response.data || []
}

export async function getRegisterByMonth(year: number, month: number): Promise<RegisterEntry[]> {
  const response = await fetchWithAuth<ApiResponse<RegisterEntry[]>>(`/register?year=${year}&month=${month}`)
  return response.data || []
}

export async function createRegisterEntry(data: Omit<RegisterEntry, 'id' | 'createdAt' | 'createdBy'>): Promise<RegisterEntry> {
  const response = await fetchWithAuth<ApiResponse<RegisterEntry>>('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create register entry')
  return response.data
}

export async function updateRegisterEntry(id: string, data: Partial<RegisterEntry>): Promise<RegisterEntry> {
  const response = await fetchWithAuth<ApiResponse<RegisterEntry>>(`/register/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update register entry')
  return response.data
}

export async function deleteRegisterEntry(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/register/${id}`, {
    method: 'DELETE',
  })
}

// Invoices
export async function getInvoices(): Promise<Invoice[]> {
  const response = await fetchWithAuth<ApiResponse<Invoice[]>>('/invoices')
  return response.data || []
}

export async function getInvoice(id: string): Promise<Invoice> {
  const response = await fetchWithAuth<ApiResponse<Invoice>>(`/invoices/${id}`)
  if (!response.data) throw new Error('Invoice not found')
  return response.data
}

export async function generateInvoices(year: number, month: number, regenerate: boolean = false): Promise<Invoice[]> {
  const response = await fetchWithAuth<ApiResponse<Invoice[]>>('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify({ year, month, regenerate }),
  })
  if (!response.data) throw new Error('Failed to generate invoices')
  return response.data
}

export async function updateInvoiceStatus(id: string, status: Invoice['status'], paidDate?: string): Promise<Invoice> {
  const response = await fetchWithAuth<ApiResponse<Invoice>>(`/invoices/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, paidDate }),
  })
  if (!response.data) throw new Error('Failed to update invoice status')
  return response.data
}

export async function getInvoicePdf(id: string): Promise<Blob> {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
    headers: token ? { 'X-App-Auth': `Bearer ${token}` } : {},
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate PDF')
  }
  
  return response.blob()
}

// Admin - User Management
export async function getUsers(): Promise<User[]> {
  const response = await fetchWithAuth<ApiResponse<User[]>>('/users/admin')
  return response.data || []
}

export async function createUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'admin' | 'worker'
}): Promise<User> {
  const response = await fetchWithAuth<ApiResponse<User>>('/users/admin', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create user')
  return response.data
}

export async function deleteUser(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/users/admin/${id}`, {
    method: 'DELETE',
  })
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  const response = await fetchWithAuth<ApiResponse<AppSettings>>('/settings')
  if (!response.data) throw new Error('Failed to fetch settings')
  return response.data
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const response = await fetchWithAuth<ApiResponse<AppSettings>>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update settings')
  return response.data
}

// Password Change
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// Incidents
export async function getIncidents(clientId?: string, status?: string): Promise<IncidentReport[]> {
  const params = new URLSearchParams()
  if (clientId) params.append('clientId', clientId)
  if (status) params.append('status', status)
  const queryString = params.toString()
  const response = await fetchWithAuth<ApiResponse<IncidentReport[]>>(`/incidents${queryString ? `?${queryString}` : ''}`)
  return response.data || []
}

export async function getIncident(id: string): Promise<IncidentReport> {
  const response = await fetchWithAuth<ApiResponse<IncidentReport>>(`/incidents/${id}`)
  if (!response.data) throw new Error('Incident not found')
  return response.data
}

export async function createIncident(data: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt' | 'reportedBy' | 'status'>): Promise<IncidentReport> {
  const response = await fetchWithAuth<ApiResponse<IncidentReport>>('/incidents', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create incident')
  return response.data
}

export async function updateIncident(id: string, data: Partial<IncidentReport>): Promise<IncidentReport> {
  const response = await fetchWithAuth<ApiResponse<IncidentReport>>(`/incidents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update incident')
  return response.data
}

export async function deleteIncident(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/incidents/${id}`, {
    method: 'DELETE',
  })
}

// Client Notes
export async function getClientNotes(clientId: string): Promise<ClientNote[]> {
  const response = await fetchWithAuth<ApiResponse<ClientNote[]>>(`/client-notes?clientId=${clientId}`)
  return response.data || []
}

export async function getClientNote(id: string): Promise<ClientNote> {
  const response = await fetchWithAuth<ApiResponse<ClientNote>>(`/client-notes/${id}`)
  if (!response.data) throw new Error('Note not found')
  return response.data
}

export async function createClientNote(data: Omit<ClientNote, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isActive'>): Promise<ClientNote> {
  const response = await fetchWithAuth<ApiResponse<ClientNote>>('/client-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create note')
  return response.data
}

export async function updateClientNote(id: string, data: Partial<ClientNote>): Promise<ClientNote> {
  const response = await fetchWithAuth<ApiResponse<ClientNote>>(`/client-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update note')
  return response.data
}

export async function deleteClientNote(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/client-notes/${id}`, {
    method: 'DELETE',
  })
}

// Staff Management
export async function getStaff(): Promise<StaffMember[]> {
  const response = await fetchWithAuth<ApiResponse<StaffMember[]>>('/staff')
  return response.data || []
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  const response = await fetchWithAuth<ApiResponse<StaffMember>>(`/staff/${id}`)
  if (!response.data) throw new Error('Staff member not found')
  return response.data
}

export async function getStaffByUserId(userId: string): Promise<StaffMember | null> {
  try {
    const response = await fetchWithAuth<ApiResponse<StaffMember>>(`/staff/by-user/${userId}`)
    return response.data || null
  } catch {
    return null
  }
}

export async function createStaff(data: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt' | 'concatName' | 'isActive'>): Promise<StaffMember> {
  const response = await fetchWithAuth<ApiResponse<StaffMember>>('/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create staff member')
  return response.data
}

export async function updateStaff(id: string, data: Partial<StaffMember>): Promise<StaffMember> {
  const response = await fetchWithAuth<ApiResponse<StaffMember>>(`/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update staff member')
  return response.data
}

export async function deleteStaff(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/staff/${id}`, {
    method: 'DELETE',
  })
}

// Staff Register
export async function getStaffRegisterByDate(date: string): Promise<StaffRegisterEntry[]> {
  const response = await fetchWithAuth<ApiResponse<StaffRegisterEntry[]>>(`/staff-register?date=${date}`)
  return response.data || []
}

export async function getStaffRegisterByMonth(year: number, month: number): Promise<StaffRegisterEntry[]> {
  const response = await fetchWithAuth<ApiResponse<StaffRegisterEntry[]>>(`/staff-register?year=${year}&month=${month}`)
  return response.data || []
}

export async function createStaffRegisterEntry(data: { staffId: string; date: string; notes?: string }): Promise<StaffRegisterEntry> {
  const response = await fetchWithAuth<ApiResponse<StaffRegisterEntry>>('/staff-register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to create staff register entry')
  return response.data
}

export async function updateStaffRegisterEntry(id: string, data: Partial<StaffRegisterEntry>): Promise<StaffRegisterEntry> {
  const response = await fetchWithAuth<ApiResponse<StaffRegisterEntry>>(`/staff-register/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update staff register entry')
  return response.data
}

export async function deleteStaffRegisterEntry(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/staff-register/${id}`, {
    method: 'DELETE',
  })
}

// Staff Reconciliation
export async function getStaffReconciliation(year: number, month: number): Promise<StaffReconciliation[]> {
  const response = await fetchWithAuth<ApiResponse<StaffReconciliation[]>>(`/staff-reconciliation?year=${year}&month=${month}`)
  return response.data || []
}

// ============================================
// Client Registrations (Public + Admin)
// ============================================

/**
 * Public fetch wrapper (no authentication required)
 * Used for public-facing endpoints like client registration
 */
async function fetchPublic<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(
      errorBody.message || `Request failed (${response.status})`,
      response.status,
      errorBody.code
    )
  }
  
  return response.json()
}

// Extended form data type with security fields
type ClientRegistrationSubmission = ClientRegistrationFormData & {
  _honeypot?: string
  _formLoadTime?: number
}

// Public endpoint - submit registration (no auth required)
export async function submitClientRegistration(data: ClientRegistrationSubmission): Promise<{ message: string; id: string }> {
  const response = await fetchPublic<ApiResponse<{ message: string; id: string }>>('/client-registration', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to submit registration')
  return response.data
}

// Admin endpoints
export async function getRegistrations(reviewed?: boolean): Promise<ClientRegistration[]> {
  const params = reviewed !== undefined ? `?reviewed=${reviewed}` : ''
  const response = await fetchWithAuth<ApiResponse<ClientRegistration[]>>(`/registrations${params}`)
  return response.data || []
}

export async function getRegistration(id: string): Promise<ClientRegistration> {
  const response = await fetchWithAuth<ApiResponse<ClientRegistration>>(`/registrations/${id}`)
  if (!response.data) throw new Error('Registration not found')
  return response.data
}

export async function updateRegistration(id: string, data: Partial<ClientRegistration>): Promise<ClientRegistration> {
  const response = await fetchWithAuth<ApiResponse<ClientRegistration>>(`/registrations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.data) throw new Error('Failed to update registration')
  return response.data
}

export async function deleteRegistration(id: string): Promise<void> {
  await fetchWithAuth<ApiResponse<void>>(`/registrations/${id}`, {
    method: 'DELETE',
  })
}

