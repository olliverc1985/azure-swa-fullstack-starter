import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { getClients, getRegisterByDate, createRegisterEntry } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Checkbox,
  Badge,
  Skeleton,
  Input,
  Textarea,
  useToast,
} from '@/components/ui'
import { formatCurrency, formatDateLong } from '@/lib/utils'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { ClientQuickView } from '@/components/clients'
import { useAuth } from '@/hooks/useAuth'
import type { Client, DayOfWeek, PaymentType, AttendanceStatus } from '@/types'

const dayColors: Record<DayOfWeek, string> = {
  monday: 'bg-gray-100 text-gray-700',
  tuesday: 'bg-blue-100 text-blue-700',
  wednesday: 'bg-green-100 text-green-700',
  thursday: 'bg-purple-100 text-purple-700',
  friday: 'bg-amber-100 text-amber-700',
  saturday: 'bg-slate-100 text-slate-700',
  sunday: 'bg-red-100 text-red-700',
}

export function RegisterPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isWorker = user?.role === 'worker'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllClients, setShowAllClients] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, { 
    attendanceStatus: AttendanceStatus; 
    paymentType: PaymentType; 
    cashOwed?: number 
  }>>({})
  const [notes, setNotes] = useState('')
  const [alertClient, setAlertClient] = useState<Client | null>(null)
  const [quickViewClient, setQuickViewClient] = useState<Client | null>(null)
  
  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayOfWeek = format(selectedDate, 'EEEE').toLowerCase() as DayOfWeek

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  const { data: existingEntries = [], isLoading: registerLoading } = useQuery({
    queryKey: ['register', dateString],
    queryFn: () => getRegisterByDate(dateString),
  })

  // Load existing attendance when date changes
  useEffect(() => {
    const existingAttendance: Record<string, { attendanceStatus: AttendanceStatus; paymentType: PaymentType; cashOwed?: number }> = {}
    existingEntries.forEach((entry) => {
      // Map from backend - use attendanceStatus if available, otherwise derive from attended boolean
      const status: AttendanceStatus = entry.attendanceStatus || (entry.attended ? 'present' : 'absent')
      existingAttendance[entry.clientId] = {
        attendanceStatus: status,
        paymentType: entry.paymentType || 'invoice',
        cashOwed: entry.cashOwed,
      }
    })
    setAttendance(existingAttendance)
  }, [existingEntries])

  // Filter clients by day and search
  const filteredClients = useMemo(() => {
    let filtered = clients.filter((c) => c.isActive)
    
    // When searching, search ALL clients (to find people on wrong day)
    // Otherwise filter by day of week (unless showing all)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((client) =>
        client.concatName.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
      )
    } else if (!showAllClients) {
      filtered = filtered.filter((client) => {
        // Show if client attends on this day
        if (client.attendingDays?.includes(selectedDayOfWeek)) {
          return true
        }
        // Hide clients with no attending days or different days
        return false
      })
    }
    
    // Sort by name
    return filtered.sort((a, b) => a.concatName.localeCompare(b.concatName))
  }, [clients, selectedDayOfWeek, showAllClients, searchQuery])

  // Count clients for this day
  const clientsForDay = clients.filter((c) => 
    c.isActive && c.attendingDays?.includes(selectedDayOfWeek)
  ).length

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(attendance)
        .filter(([_, data]) => data.attendanceStatus === 'present' || data.attendanceStatus === 'late-cancellation')
        .map(([clientId, data]) => {
          const client = clients.find((c) => c.id === clientId)
          // Cash clients always pay cash, otherwise use the selected paymentType
          const paymentType: PaymentType = client?.paymentMethod === 'cash' ? 'cash' : data.paymentType
          return {
            clientId,
            clientName: client?.concatName || '',
            date: dateString,
            attendanceStatus: data.attendanceStatus,
            attended: true, // Legacy field - kept for backwards compat
            payment: client?.rate || 40,
            paymentType,
            invoiceCode: '',
            notes: notes || undefined,
            // Track cash owed if marked (only for present, not late cancellations)
            cashOwed: data.attendanceStatus === 'present' ? data.cashOwed : undefined,
          }
        })
      
      // Save each entry (in a real app, use bulk endpoint)
      for (const entry of entries) {
        await createRegisterEntry(entry)
      }
      
      return entries.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['register'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`Saved ${count} attendance record${count !== 1 ? 's' : ''}!`, 'Register Saved')
    },
    onError: (error: Error) => {
      toast.error(error.message, 'Failed to Save')
    },
  })

  const handleAttendanceChange = (clientId: string, status: AttendanceStatus, paymentType?: PaymentType) => {
    const client = clients.find((c) => c.id === clientId)
    // Default paymentType based on client's preference
    const defaultPaymentType: PaymentType = client?.paymentMethod === 'cash' ? 'cash' : 'invoice'
    
    setAttendance((prev) => ({
      ...prev,
      [clientId]: {
        attendanceStatus: status,
        paymentType: paymentType ?? prev[clientId]?.paymentType ?? defaultPaymentType,
      },
    }))
    
    // Show important info alert when marking someone as present (not late cancellation)
    if (status === 'present') {
      if (client?.importantInfo) {
        setAlertClient(client)
      }
    }
  }

  const handlePaymentTypeChange = (clientId: string, paymentType: PaymentType) => {
    setAttendance((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        attendanceStatus: prev[clientId]?.attendanceStatus ?? 'absent',
        paymentType,
        cashOwed: 0, // Clear cashOwed when payment type changes (use 0 to ensure backend clears it)
      },
    }))
  }

  const handleCashOwedChange = (clientId: string, owes: boolean) => {
    const client = clients.find((c) => c.id === clientId)
    setAttendance((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        attendanceStatus: prev[clientId]?.attendanceStatus ?? 'absent',
        paymentType: prev[clientId]?.paymentType ?? 'cash',
        // Use 0 instead of undefined when not owed - this ensures the backend clears the value
        cashOwed: owes ? (client?.rate || 40) : 0,
      },
    }))
  }

  const handleMarkAllPresent = () => {
    const newAttendance: Record<string, { attendanceStatus: AttendanceStatus; paymentType: PaymentType; cashOwed?: number }> = {}
    filteredClients.forEach((client) => {
      // Use client's default payment method
      const defaultPaymentType: PaymentType = client.paymentMethod === 'cash' ? 'cash' : 'invoice'
      newAttendance[client.id] = {
        attendanceStatus: 'present',
        paymentType: attendance[client.id]?.paymentType ?? defaultPaymentType,
        cashOwed: attendance[client.id]?.cashOwed,
      }
    })
    setAttendance(newAttendance)
  }

  // Helper to check if entry is billable (present or late-cancellation)
  const isBillable = (status: AttendanceStatus | undefined) => status === 'present' || status === 'late-cancellation'
  const isPresent = (status: AttendanceStatus | undefined) => status === 'present'
  const isLateCancellation = (status: AttendanceStatus | undefined) => status === 'late-cancellation'
  
  const presentCount = Object.values(attendance).filter((a) => isPresent(a.attendanceStatus)).length
  const lateCancelCount = Object.values(attendance).filter((a) => isLateCancellation(a.attendanceStatus)).length
  const billableCount = presentCount + lateCancelCount
  
  const cashCount = Object.entries(attendance)
    .filter(([clientId, a]) => {
      if (!isPresent(a.attendanceStatus)) return false // Only present can pay cash
      if (a.cashOwed) return false // Don't count cash owed as cash paid
      const client = clients.find((c) => c.id === clientId)
      return client?.paymentMethod === 'cash' || a.paymentType === 'cash'
    }).length
  const cashOwedCount = Object.values(attendance).filter((a) => isPresent(a.attendanceStatus) && a.cashOwed).length
  const cashOwedTotal = Object.values(attendance)
    .filter((a) => isPresent(a.attendanceStatus) && a.cashOwed)
    .reduce((sum, a) => sum + (a.cashOwed || 0), 0)
  const invoiceCount = presentCount - cashCount - cashOwedCount + lateCancelCount // Late cancellations are always invoiced
  const totalRevenue = clients
    ?.filter((c) => isBillable(attendance[c.id]?.attendanceStatus))
    .reduce((sum, c) => sum + c.rate, 0) || 0
  const cashRevenue = clients
    ?.filter((c) => {
      const a = attendance[c.id]
      if (!isPresent(a?.attendanceStatus)) return false // Only present can pay cash
      return c.paymentMethod === 'cash' || a.paymentType === 'cash'
    })
    .reduce((sum, c) => sum + c.rate, 0) || 0

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1))
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1))
  const goToToday = () => setSelectedDate(new Date())

  // Generate week dates for quick navigation
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const isLoading = clientsLoading || registerLoading

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Register</h1>
          <p className="text-sm sm:text-base text-gray-500">Record attendance</p>
        </div>
        <Button onClick={goToToday} variant="outline" size="sm" className="sm:h-10 sm:px-4">
          <CalendarIcon className="mr-1.5 sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Today</span>
          <span className="sm:hidden">Now</span>
        </Button>
      </div>

      {/* Date navigation */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            
            <div className="text-center min-w-0 flex-1">
              <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {formatDateLong(selectedDate)}
              </p>
              <Badge className={`mt-1 text-[10px] sm:text-xs ${dayColors[selectedDayOfWeek]}`}>
                {clientsForDay} scheduled
              </Badge>
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextDay} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Week quick nav - horizontal scroll on mobile */}
          <div className="mt-3 sm:mt-4 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex justify-start sm:justify-center gap-1 min-w-max sm:min-w-0">
              {weekDates.map((date) => {
                const dayOfWeek = format(date, 'EEEE').toLowerCase() as DayOfWeek
                const clientCount = clients.filter((c) => 
                  c.isActive && c.attendingDays?.includes(dayOfWeek)
                ).length
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm transition-colors flex-shrink-0 min-w-[48px] sm:min-w-0 ${
                      isSameDay(date, selectedDate)
                        ? 'bg-primary-500 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs font-medium">
                      {format(date, 'EEE')}
                    </span>
                    <span className="text-base sm:text-lg font-semibold">
                      {format(date, 'd')}
                    </span>
                    {clientCount > 0 && !isSameDay(date, selectedDate) && (
                      <span className="text-[10px] text-gray-400">{clientCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance list */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* Search and filters */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 sm:pl-10 h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showAllClients ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowAllClients(!showAllClients)}
                    className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                  >
                    <UserGroupIcon className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">{showAllClients ? 'Showing All' : 'Show All'}</span>
                    <span className="sm:hidden">All</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllPresent}
                    disabled={filteredClients.length === 0}
                    className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                  >
                    <CheckCircleIcon className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Mark All Present</span>
                    <span className="sm:hidden">All Present</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>
                  {showAllClients ? 'All Clients' : `${format(selectedDate, 'EEEE')} Clients`}
                </span>
                <Badge variant="outline">{filteredClients.length} clients</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery 
                    ? `No clients found matching "${searchQuery}".`
                    : showAllClients 
                      ? 'No active clients.'
                      : `No clients scheduled for ${format(selectedDate, 'EEEE')}s. Use search to find extra attendees or click "Show All".`
                  }
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredClients.map((client) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      attendanceStatus={attendance[client.id]?.attendanceStatus || 'absent'}
                      paymentType={attendance[client.id]?.paymentType || (client.paymentMethod === 'cash' ? 'cash' : 'invoice')}
                      cashOwed={attendance[client.id]?.cashOwed}
                      selectedDay={selectedDayOfWeek}
                      onAttendanceChange={handleAttendanceChange}
                      onPaymentTypeChange={handlePaymentTypeChange}
                      onCashOwedChange={handleCashOwedChange}
                      onShowInfo={() => setQuickViewClient(client)}
                      hideRevenue={isWorker}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary - shown above client list on mobile */}
        <div className="space-y-4 sm:space-y-6 order-first lg:order-none">
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-xl">Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: Compact horizontal layout */}
              <div className="sm:hidden">
                <div className={`grid ${isWorker ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-center mb-3`}>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-600">{clientsForDay}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Expected</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-700">{presentCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Present</p>
                  </div>
                  {!isWorker && (
                    <div className="bg-primary-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-primary-600">{formatCurrency(totalRevenue)}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Revenue</p>
                    </div>
                  )}
                </div>
                {(cashCount > 0 || invoiceCount > 0 || cashOwedCount > 0 || lateCancelCount > 0) && (
                  <div className="flex justify-center gap-3 text-xs mb-3 flex-wrap">
                    {lateCancelCount > 0 && (
                      <span className="text-amber-600">⏰ {lateCancelCount} late cancel</span>
                    )}
                    {cashCount > 0 && (
                      <span className="text-emerald-600">💷 {cashCount} cash</span>
                    )}
                    {invoiceCount > 0 && (
                      <span className="text-blue-600">📄 {invoiceCount} invoice</span>
                    )}
                    {cashOwedCount > 0 && (
                      <span className="text-orange-600">⏳ {cashOwedCount} owes{!isWorker && ` ${formatCurrency(cashOwedTotal)}`}</span>
                    )}
                  </div>
                )}
                <Button 
                  className="w-full" 
                  size="default" 
                  disabled={billableCount === 0 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Register'}
                </Button>
              </div>
              
              {/* Desktop: Vertical layout */}
              <div className="hidden sm:block space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Expected</span>
                  <span className="text-xl font-semibold text-gray-600">{clientsForDay}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Present</span>
                  <span className="text-2xl font-bold text-gray-900">{presentCount}</span>
                </div>
                {lateCancelCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="text-amber-500">⏰</span> Late Cancel
                    </span>
                    <span className="text-lg font-semibold text-amber-600">
                      {lateCancelCount}
                    </span>
                  </div>
                )}
                <hr />
                {cashCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="text-emerald-500">💷</span> Cash
                    </span>
                    <span className="text-lg font-semibold text-emerald-600">
                      {cashCount}{!isWorker && ` × ${formatCurrency(cashRevenue)}`}
                    </span>
                  </div>
                )}
                {invoiceCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="text-blue-500">📄</span> Invoice
                    </span>
                    <span className="text-lg font-semibold text-blue-600">
                      {invoiceCount}{!isWorker && ` × ${formatCurrency(totalRevenue - cashRevenue - cashOwedTotal)}`}
                    </span>
                  </div>
                )}
                {cashOwedCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="text-orange-500">⏳</span> Cash Owed
                    </span>
                    <span className="text-lg font-semibold text-orange-600">
                      {cashOwedCount}{!isWorker && ` × ${formatCurrency(cashOwedTotal)}`}
                    </span>
                  </div>
                )}
                {!isWorker && (
                  <>
                    <hr />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Total Revenue</span>
                      <span className="text-2xl font-bold text-primary-600">
                        {formatCurrency(totalRevenue)}
                      </span>
                    </div>
                  </>
                )}
                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={billableCount === 0 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Register'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes - collapsible on mobile */}
          <Card className="hidden sm:block">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                placeholder="Add notes for this session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Important Info Alert Modal */}
      {alertClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
            <CardHeader className="bg-amber-50 border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-amber-500">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-lg font-semibold text-gray-900 mb-3">
                {alertClient.concatName}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
                <p className="whitespace-pre-wrap">{alertClient.importantInfo}</p>
              </div>
              <Button 
                className="w-full mt-6" 
                onClick={() => setAlertClient(null)}
              >
                I Understand - Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client Quick View Modal */}
      {quickViewClient && (
        <ClientQuickView 
          client={quickViewClient} 
          onClose={() => setQuickViewClient(null)} 
        />
      )}
    </div>
  )
}

interface ClientRowProps {
  client: Client
  attendanceStatus: AttendanceStatus
  paymentType: PaymentType
  cashOwed?: number
  selectedDay: DayOfWeek
  onAttendanceChange: (clientId: string, status: AttendanceStatus) => void
  onPaymentTypeChange: (clientId: string, paymentType: PaymentType) => void
  onCashOwedChange: (clientId: string, owes: boolean) => void
  onShowInfo: () => void
  hideRevenue?: boolean
}

function ClientRow({ client, attendanceStatus, paymentType, cashOwed, selectedDay, onAttendanceChange, onPaymentTypeChange, onCashOwedChange, onShowInfo, hideRevenue }: ClientRowProps) {
  const isCashClient = client.paymentMethod === 'cash'
  const isPresent = attendanceStatus === 'present'
  const isLateCancellation = attendanceStatus === 'late-cancellation'
  const isBillable = isPresent || isLateCancellation
  
  // Cycle through states: absent -> present -> late-cancellation -> absent
  const handleRowClick = () => {
    if (attendanceStatus === 'absent') {
      onAttendanceChange(client.id, 'present')
    } else if (attendanceStatus === 'present') {
      onAttendanceChange(client.id, 'late-cancellation')
    } else {
      onAttendanceChange(client.id, 'absent')
    }
  }
  
  return (
    <div
      className={`p-3 sm:p-4 transition-colors cursor-pointer ${
        isLateCancellation
          ? 'bg-amber-50' // Late cancellation - amber tint
          : isPresent 
            ? cashOwed 
              ? 'bg-orange-50' // Cash owed - orange tint
              : paymentType === 'cash' 
                ? 'bg-emerald-50' 
                : 'bg-green-50' 
            : 'hover:bg-gray-50'
      }`}
      onClick={handleRowClick}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        <Checkbox
          checked={isPresent}
          onCheckedChange={(checked) => onAttendanceChange(client.id, checked ? 'present' : 'absent')}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5"
        />
        {/* Info button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShowInfo()
          }}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-primary-100 text-primary-600 transition-colors"
          title="View client info"
        >
          <InformationCircleIcon className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold text-xs sm:text-sm">
          {client.firstName[0]}{client.surname[0]}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-medium text-gray-900 text-sm sm:text-base flex items-center gap-1 min-w-0">
            <span className="truncate min-w-0 flex-1">{client.concatName}</span>
            {isCashClient && (
              <span className="text-emerald-500 flex-shrink-0" title="Cash client">💷</span>
            )}
            {client.importantInfo && (
              <span className="text-amber-500 flex-shrink-0" title="Has important information">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </p>
          {/* Day badges - hidden on mobile to reduce clutter */}
          <div className="hidden sm:flex flex-wrap gap-1 mt-0.5">
            {client.attendingDays?.map((day) => (
              <span
                key={day}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  day === selectedDay
                    ? 'bg-primary-500 text-white'
                    : dayColors[day]
                }`}
              >
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </span>
            ))}
          </div>
        </div>
        
        {/* Rate - hidden for workers */}
        {!hideRevenue && (
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(client.rate)}</p>
          </div>
        )}
      </div>
      
      {/* Mobile: Payment controls below when billable */}
      {isBillable && (
        <div className="mt-2 pt-2 border-t border-gray-100 sm:border-0 sm:pt-0 sm:mt-0 flex items-center justify-between sm:hidden">
          {isLateCancellation ? (
            // Late cancellation - just show status and option to change
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onAttendanceChange(client.id, 'present')}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-gray-100 text-gray-600"
              >
                ✓ Present
              </button>
              <button
                type="button"
                onClick={() => onAttendanceChange(client.id, 'absent')}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-gray-100 text-gray-600"
              >
                ✕ Remove
              </button>
            </div>
          ) : !isCashClient ? (
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onPaymentTypeChange(client.id, 'invoice')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  paymentType === 'invoice' && !cashOwed
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                📄 Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  onPaymentTypeChange(client.id, 'cash')
                  onCashOwedChange(client.id, false)
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  paymentType === 'cash' && !cashOwed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                💷 Cash
              </button>
              <button
                type="button"
                onClick={() => onAttendanceChange(client.id, 'late-cancellation')}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-gray-100 text-gray-600"
              >
                ⏰ Late
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onCashOwedChange(client.id, false)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  !cashOwed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                💷 Paid
              </button>
              <button
                type="button"
                onClick={() => onCashOwedChange(client.id, true)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  cashOwed
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                ⏳ Owes
              </button>
              <button
                type="button"
                onClick={() => onAttendanceChange(client.id, 'late-cancellation')}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-gray-100 text-gray-600"
              >
                ⏰ Late
              </button>
            </div>
          )}
          {isLateCancellation ? (
            <Badge className="bg-amber-100 text-amber-700 text-xs">⏰ Late Cancel</Badge>
          ) : cashOwed ? (
            <Badge className="bg-orange-100 text-orange-700 text-xs">⏳ Owes{!hideRevenue && ` £${cashOwed}`}</Badge>
          ) : (
            <Badge variant="success" className="text-xs">✓ Present</Badge>
          )}
        </div>
      )}
      
      {/* Desktop: Payment controls inline */}
      <div className="hidden sm:contents">
        {/* Late cancellation - show status and options */}
        {isLateCancellation && (
          <div className="flex gap-1 mt-2 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onAttendanceChange(client.id, 'present')}
              className="px-2 py-1 text-xs rounded font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="Mark as present"
            >
              ✓ Present
            </button>
            <button
              type="button"
              onClick={() => onAttendanceChange(client.id, 'absent')}
              className="px-2 py-1 text-xs rounded font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="Remove"
            >
              ✕
            </button>
            <Badge className="ml-1 bg-amber-100 text-amber-700">⏰ Late Cancel</Badge>
          </div>
        )}
        
        {/* Payment type toggle - only for invoice clients who are marked present */}
        {isPresent && !isCashClient && (
          <div className="flex gap-1 mt-2 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onPaymentTypeChange(client.id, 'invoice')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                paymentType === 'invoice' && !cashOwed
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Add to monthly invoice"
            >
              📄
            </button>
            <button
              type="button"
              onClick={() => {
                onPaymentTypeChange(client.id, 'cash')
                onCashOwedChange(client.id, false)
              }}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                paymentType === 'cash' && !cashOwed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Paid cash today"
            >
              💷
            </button>
            <button
              type="button"
              onClick={() => onAttendanceChange(client.id, 'late-cancellation')}
              className="px-2 py-1 text-xs rounded font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="Late cancellation (<24hr notice)"
            >
              ⏰
            </button>
            {cashOwed ? (
              <Badge className="ml-1 bg-orange-100 text-orange-700">⏳ Owes{!hideRevenue && ` £${cashOwed}`}</Badge>
            ) : (
              <Badge variant="success" className="ml-1">Present</Badge>
            )}
          </div>
        )}
        
        {/* Show controls for cash clients - can mark as paid or owing */}
        {isPresent && isCashClient && (
          <div className="flex gap-1 mt-2 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onCashOwedChange(client.id, false)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                !cashOwed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Paid cash"
            >
              💷 Paid
            </button>
            <button
              type="button"
              onClick={() => onCashOwedChange(client.id, true)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                cashOwed
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Owes cash"
            >
              ⏳ Owes
            </button>
            <button
              type="button"
              onClick={() => onAttendanceChange(client.id, 'late-cancellation')}
              className="px-2 py-1 text-xs rounded font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="Late cancellation (<24hr notice)"
            >
              ⏰
            </button>
            {cashOwed ? (
              <Badge className="ml-1 bg-orange-100 text-orange-700">{hideRevenue ? '⏳ Owes' : `£${cashOwed}`}</Badge>
            ) : (
              <Badge variant="success" className="ml-1">Present</Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
