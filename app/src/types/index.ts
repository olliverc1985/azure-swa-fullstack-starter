// User and Authentication Types
export type UserRole = 'admin' | 'worker'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Days of the week type
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

// Payment types
export type PaymentMethod = 'cash' | 'invoice' // Client's default payment method
export type PaymentType = 'cash' | 'invoice' // Per-session payment type

// Attendance status for tracking presence vs billable sessions
// - 'present': Physically in the building, billable
// - 'late-cancellation': Not present, but billable (cancelled with <24hr notice)
// - 'absent': Not present, not billable (cancelled with proper notice)
export type AttendanceStatus = 'present' | 'late-cancellation' | 'absent'

// Reusable Address interface
export interface Address {
  line1?: string
  line2?: string
  line3?: string  // Town/City
  line4?: string  // County
  postcode?: string
}

// Emergency Contact interface
export interface EmergencyContact {
  name: string
  relationship: string
  phoneNumber: string
  email?: string
}

// Client Types
export interface Client {
  id: string
  firstName: string
  surname: string
  concatName: string
  dateOfBirth?: string // ISO date string YYYY-MM-DD
  contactNumber?: string
  email: string
  // Primary address (person's address)
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
  postcode?: string
  // Separate billing address for invoices
  billingAddress?: Address
  useSeparateBillingAddress?: boolean
  // Separate correspondence address (if different from primary)
  correspondenceAddress?: Address
  useSeparateCorrespondenceAddress?: boolean
  // Invoice email (if different from main email)
  invoiceEmail?: string
  // Emergency contact details
  emergencyContact?: EmergencyContact
  rate: number // £36 or £40 per session
  notes?: string
  importantInfo?: string // Special requirements, preferences, etc.
  attendingDays?: DayOfWeek[] // Days the client typically attends
  paymentMethod: PaymentMethod // 'cash' = always pays cash, 'invoice' = monthly invoice (default)
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Register/Attendance Types
export interface RegisterEntry {
  id: string
  clientId: string
  clientName: string
  date: string // ISO date string YYYY-MM-DD
  attendanceStatus?: AttendanceStatus // New: primary attendance field
  attended: boolean // Legacy: kept for backwards compatibility
  payment: number
  paymentType: PaymentType // 'cash' = paid cash on day, 'invoice' = add to monthly invoice
  invoiceCode: string
  notes?: string
  // Cash owed tracking (Phase 3)
  cashOwed?: number // Amount of cash owed if payment was delayed
  cashOwedPaidDate?: string // When the owed cash was actually paid
  cashOwedPaidBy?: string // User ID who recorded the payment
  createdAt: string
  createdBy: string
}

export interface DailyRegister {
  date: string
  entries: RegisterEntry[]
  totalAttendees: number
  totalRevenue: number
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceLineItem {
  date: string
  description: string
  amount: number
}

export interface Invoice {
  id: string
  invoiceNumber: string // e.g., "202511-JoHu"
  clientId: string
  clientName: string
  billingAddress: {
    line1?: string
    line2?: string
    line3?: string
    line4?: string
    postcode?: string
  }
  billingEmail: string
  invoiceDate: string
  dueDate: string
  periodStart: string
  periodEnd: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  total: number
  status: InvoiceStatus
  paidDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// App Settings Types
export interface AppSettings {
  id: string
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

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form Types
export interface ClientFormData {
  firstName: string
  surname: string
  dateOfBirth?: string
  contactNumber?: string
  email: string
  // Primary address
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
  postcode?: string
  // Billing address
  billingAddress?: Address
  useSeparateBillingAddress?: boolean
  // Correspondence address
  correspondenceAddress?: Address
  useSeparateCorrespondenceAddress?: boolean
  // Invoice email
  invoiceEmail?: string
  // Emergency contact
  emergencyContact?: EmergencyContact
  rate: number
  notes?: string
  importantInfo?: string
  attendingDays?: DayOfWeek[]
  paymentMethod?: PaymentMethod
  isActive?: boolean
}

export interface RegisterFormData {
  clientId: string
  date: string
  attended: boolean
  notes?: string
}

// Statistics Types
export interface DashboardStats {
  totalClients: number
  activeClients: number
  sessionsThisMonth: number
  revenueThisMonth: number
  unpaidInvoices: number
  unpaidAmount: number
}

export interface MonthlyIncome {
  month: string
  year: number
  totalSessions: number
  totalRevenue: number
}

// Dashboard Trends Types
export interface MonthlyTrend {
  period: string // YYYY-MM
  year: number
  month: number
  monthName: string
  totalSessions: number
  totalRevenue: number
  uniqueClients: number
  averageSessionValue: number
}

export interface TrendsResponse {
  monthly: MonthlyTrend[]
  summary: {
    totalRevenue: number
    totalSessions: number
    averageMonthlyRevenue: number
    averageMonthlySessions: number
    growthRate: number
  }
}

// Dashboard Analytics Types
export interface DayOfWeekData {
  day: string
  dayIndex: number
  totalSessions: number
  totalRevenue: number
  averageSessions: number
  averageRevenue: number
  weeks: number
}

export interface ByDayAnalyticsResponse {
  startDate: string
  endDate: string
  totalWeeks: number
  data: DayOfWeekData[]
}

export interface ComparisonData {
  current: {
    period: string
    sessions: number
    revenue: number
    clients: number
  }
  previous: {
    period: string
    sessions: number
    revenue: number
    clients: number
  }
  change: {
    sessions: number
    sessionsPercent: number
    revenue: number
    revenuePercent: number
    clients: number
    clientsPercent: number
  }
  isPartialPeriod: boolean // True when comparing partial periods (e.g., mid-month)
}

export interface ClientActivityData {
  clientId: string
  clientName: string
  sessionCount: number
  totalSpent: number
  lastAttended: string
  daysInactive: number
}

export interface ClientActivityResponse {
  topAttendees: ClientActivityData[]
  atRiskClients: ClientActivityData[]
  totalActiveClients: number
  inactiveDaysThreshold: number
}

// Invoice Status Breakdown (for dashboard)
export interface InvoiceStatusBreakdown {
  draft: number
  sent: number
  paid: number
  overdue: number
  cancelled: number
  totalOutstanding: number
}

// Union type for all analytics responses
export type AnalyticsResponse = 
  | ByDayAnalyticsResponse 
  | ComparisonData 
  | ClientActivityResponse
  | Record<string, unknown>

// Incident Report Types (Phase 2)
export type IncidentSeverity = 'low' | 'medium' | 'high'
export type IncidentStatus = 'open' | 'resolved'

export interface IncidentReport {
  id: string
  clientId: string
  clientName: string
  date: string // ISO date string YYYY-MM-DD
  time: string // HH:mm format
  description: string
  actionTaken: string
  reportedBy: string // User ID
  reportedByName: string
  witnesses?: string[]
  severity: IncidentSeverity
  followUpRequired: boolean
  followUpNotes?: string
  status: IncidentStatus
  createdAt: string
  updatedAt: string
}

// Staff Member Types
export interface StaffMember {
  id: string
  userId?: string // Links to User.id - allows staff to check themselves in
  firstName: string
  lastName: string
  concatName: string // "FirstName LastName"
  email: string
  phoneNumber?: string
  dayRate: number // e.g., £150/day
  workingDays?: DayOfWeek[] // Expected working days
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Staff Attendance Entry
export interface StaffRegisterEntry {
  id: string
  staffId: string
  staffName: string
  date: string // YYYY-MM-DD
  dayRate: number // Rate at time of entry for historical accuracy
  notes?: string
  createdAt: string
  createdBy: string
}

// Staff Reconciliation (monthly summary for invoice comparison)
export interface StaffReconciliation {
  staffId: string
  staffName: string
  dayRate: number
  daysWorked: number
  totalAmount: number // daysWorked × dayRate
  entries: StaffRegisterEntry[]
}

// Staff Form Data
export interface StaffFormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  dayRate: number
  workingDays?: DayOfWeek[]
  notes?: string
  userId?: string
  isActive?: boolean
}

// Client Registration Types (Public form submissions)
export interface ClientRegistration {
  id: string
  // Personal details
  firstName: string
  surname: string
  dateOfBirth: string
  email: string
  contactNumber: string
  // Primary address
  addressLine1: string
  addressLine2?: string
  addressLine3: string  // Town/City
  addressLine4?: string // County
  postcode: string
  // Emergency contact
  emergencyContact: {
    name: string
    relationship: string
    phoneNumber: string
    email?: string
  }
  // Important info
  importantInfo?: string
  // Consent
  photoConsent?: boolean  // Consent to use photos on social media
  // Billing (optional)
  invoiceEmail?: string
  billingAddress?: Address
  useSeparateBillingAddress?: boolean
  // Metadata
  submittedAt: string
  reviewed: boolean
  reviewedAt?: string
  reviewedBy?: string
  notes?: string // Admin notes about the registration
  // Security metadata (admin only)
  submissionIp?: string
  userAgent?: string
}

export interface ClientRegistrationFormData {
  firstName: string
  surname: string
  dateOfBirth: string
  email: string
  contactNumber: string
  addressLine1: string
  addressLine2?: string
  addressLine3: string
  addressLine4?: string
  postcode: string
  emergencyContact: {
    name: string
    relationship: string
    phoneNumber: string
    email?: string
  }
  importantInfo?: string
  photoConsent?: boolean  // Consent to use photos on social media
  invoiceEmail?: string
  billingAddress?: Address
  useSeparateBillingAddress?: boolean
}

// Client Notes Types
export type ClientNoteType = 
  | 'general' 
  | 'requirements' 
  | 'preferences' 
  | 'billing'
  | 'feedback'
  | 'follow_up'
  | 'other'

export const CLIENT_NOTE_TYPE_LABELS: Record<ClientNoteType, string> = {
  general: 'General Notes',
  requirements: 'Special Requirements',
  preferences: 'Preferences',
  billing: 'Billing Information',
  feedback: 'Feedback',
  follow_up: 'Follow-up Actions',
  other: 'Other Notes',
}

export interface ClientNote {
  id: string
  clientId: string
  noteType: ClientNoteType
  title: string // Auto-filled from type or custom for 'other'
  content: string // The actual typed note
  createdBy: string // User ID
  createdByName: string
  createdAt: string
  updatedAt: string
  isActive: boolean // Soft delete
}

