import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { getStaffReconciliation } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Checkbox,
  Select,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import type { StaffReconciliation, StaffRegisterEntry } from '@/types'

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export function StaffReconciliationPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())
  const [invoiceReceived, setInvoiceReceived] = useState<Record<string, boolean>>({})

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => ({
    value: String(now.getFullYear() - i),
    label: String(now.getFullYear() - i),
  }))

  const { data: reconciliations = [], isLoading, error } = useQuery({
    queryKey: ['staff-reconciliation', selectedYear, selectedMonth],
    queryFn: () => getStaffReconciliation(selectedYear, selectedMonth),
  })

  const periodStart = startOfMonth(new Date(selectedYear, selectedMonth - 1))
  const periodEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1))
  const periodLabel = format(periodStart, 'MMMM yyyy')

  const goToPreviousMonth = () => {
    const prevMonth = subMonths(new Date(selectedYear, selectedMonth - 1), 1)
    setSelectedYear(prevMonth.getFullYear())
    setSelectedMonth(prevMonth.getMonth() + 1)
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(selectedYear, selectedMonth, 1)
    setSelectedYear(nextMonth.getFullYear())
    setSelectedMonth(nextMonth.getMonth() + 1)
  }

  const goToCurrentMonth = () => {
    setSelectedYear(now.getFullYear())
    setSelectedMonth(now.getMonth() + 1)
  }

  const toggleExpanded = (staffId: string) => {
    setExpandedStaff((prev) => {
      const next = new Set(prev)
      if (next.has(staffId)) {
        next.delete(staffId)
      } else {
        next.add(staffId)
      }
      return next
    })
  }

  const toggleInvoiceReceived = (staffId: string) => {
    setInvoiceReceived((prev) => ({
      ...prev,
      [staffId]: !prev[staffId],
    }))
  }

  // Summary totals
  const totalDaysWorked = reconciliations.reduce((sum, r) => sum + r.daysWorked, 0)
  const totalAmount = reconciliations.reduce((sum, r) => sum + r.totalAmount, 0)
  const invoicesReceivedCount = Object.values(invoiceReceived).filter(Boolean).length
  const outstandingCount = reconciliations.length - invoicesReceivedCount

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Staff Reconciliation</h1>
          <p className="text-sm sm:text-base text-gray-500">Compare staff invoices against attendance records</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={goToCurrentMonth} variant="outline" size="sm">
            <CalendarIcon className="mr-1.5 h-4 w-4" />
            This Month
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <PrinterIcon className="mr-1.5 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header (hidden on screen) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Staff Reconciliation Report</h1>
        <p className="text-gray-600">{periodLabel}</p>
      </div>

      {/* Month navigation */}
      <Card className="print:hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-9 w-9 sm:h-10 sm:w-10">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Select
                value={String(selectedMonth)}
                onChange={(value) => setSelectedMonth(Number(value))}
                options={MONTHS}
                className="w-32"
              />
              <Select
                value={String(selectedYear)}
                onChange={(value) => setSelectedYear(Number(value))}
                options={yearOptions}
                className="w-24"
              />
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-9 w-9 sm:h-10 sm:w-10">
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="text-center mt-2">
            <p className="text-sm text-gray-500">
              {format(periodStart, 'd MMM')} - {format(periodEnd, 'd MMM yyyy')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-500">Staff Members</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{reconciliations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-500">Total Days</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{totalDaysWorked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-500">Total Due</p>
            <p className="text-2xl sm:text-3xl font-bold text-violet-600 mt-1">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-gray-500">Invoices Outstanding</p>
            <p className={`text-2xl sm:text-3xl font-bold mt-1 ${outstandingCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {outstandingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation table */}
      <Card>
        <CardHeader className="print:hidden">
          <CardTitle className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-violet-600" />
            {periodLabel} Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              {error instanceof Error ? error.message : 'Failed to load reconciliation data. Please try again.'}
              <p className="text-sm text-gray-500 mt-2">
                If you do not have administrator access, please contact an administrator.
              </p>
            </div>
          ) : reconciliations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No staff attendance records for {periodLabel}.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Table header - desktop */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider print:grid">
                <div className="col-span-4">Staff Member</div>
                <div className="col-span-2 text-center">Days Worked</div>
                <div className="col-span-2 text-right">Day Rate</div>
                <div className="col-span-2 text-right">Total Due</div>
                <div className="col-span-2 text-center print:hidden">Invoice Received</div>
              </div>
              
              {reconciliations.map((reconciliation) => (
                <ReconciliationRow
                  key={reconciliation.staffId}
                  reconciliation={reconciliation}
                  isExpanded={expandedStaff.has(reconciliation.staffId)}
                  invoiceReceived={invoiceReceived[reconciliation.staffId] || false}
                  onToggleExpand={() => toggleExpanded(reconciliation.staffId)}
                  onToggleInvoice={() => toggleInvoiceReceived(reconciliation.staffId)}
                />
              ))}
              
              {/* Totals row */}
              <div className="grid grid-cols-12 gap-4 px-4 py-4 bg-gray-50 font-semibold">
                <div className="col-span-4 sm:col-span-4">
                  <span className="text-gray-900">Totals</span>
                </div>
                <div className="col-span-2 sm:col-span-2 text-center text-gray-900">
                  {totalDaysWorked}
                </div>
                <div className="col-span-2 sm:col-span-2 text-right text-gray-400">
                  —
                </div>
                <div className="col-span-4 sm:col-span-2 text-right text-violet-600">
                  {formatCurrency(totalAmount)}
                </div>
                <div className="hidden sm:block col-span-2 text-center print:hidden">
                  <Badge variant={outstandingCount === 0 ? 'success' : 'outline'}>
                    {invoicesReceivedCount}/{reconciliations.length}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .space-y-4, .space-y-4 * {
            visibility: visible;
          }
          .space-y-4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:grid {
            display: grid !important;
          }
        }
      `}</style>
    </div>
  )
}

interface ReconciliationRowProps {
  reconciliation: StaffReconciliation
  isExpanded: boolean
  invoiceReceived: boolean
  onToggleExpand: () => void
  onToggleInvoice: () => void
}

function ReconciliationRow({
  reconciliation,
  isExpanded,
  invoiceReceived,
  onToggleExpand,
  onToggleInvoice,
}: ReconciliationRowProps) {
  return (
    <div className={invoiceReceived ? 'bg-green-50/50' : ''}>
      {/* Main row */}
      <div
        className="grid grid-cols-12 gap-2 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors items-center"
        onClick={onToggleExpand}
      >
        {/* Staff info */}
        <div className="col-span-6 sm:col-span-4 flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white font-semibold text-xs sm:text-sm">
            {reconciliation.staffName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
              {reconciliation.staffName}
            </p>
            <p className="text-xs text-gray-500 sm:hidden">
              {reconciliation.daysWorked} days × {formatCurrency(reconciliation.dayRate)}
            </p>
          </div>
        </div>
        
        {/* Days worked */}
        <div className="hidden sm:block col-span-2 text-center">
          <span className="text-lg font-semibold text-gray-900">{reconciliation.daysWorked}</span>
        </div>
        
        {/* Day rate */}
        <div className="hidden sm:block col-span-2 text-right">
          <span className="text-gray-600">{formatCurrency(reconciliation.dayRate)}</span>
        </div>
        
        {/* Total */}
        <div className="col-span-4 sm:col-span-2 text-right">
          <span className="text-lg font-bold text-violet-600">{formatCurrency(reconciliation.totalAmount)}</span>
        </div>
        
        {/* Invoice checkbox + expand */}
        <div className="col-span-2 flex items-center justify-end gap-2 print:hidden">
          <Checkbox
            checked={invoiceReceived}
            onCheckedChange={() => onToggleInvoice()}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5"
          />
          {invoiceReceived && (
            <CheckCircleIcon className="h-4 w-4 text-green-500 hidden sm:block" />
          )}
          <button
            type="button"
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 print:pb-2">
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Attendance Records ({reconciliation.entries.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {reconciliation.entries.map((entry: StaffRegisterEntry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg px-3 py-2 text-center border border-gray-200"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(entry.date), 'EEE d')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(entry.date), 'MMM')}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-gray-400 truncate mt-1" title={entry.notes}>
                      {entry.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

