import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoices, generateInvoices, updateInvoiceStatus, getSettings } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Select,
  Skeleton,
  IconButton,
  Checkbox,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { Invoice, InvoiceStatus, AppSettings } from '@/types'

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'info' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'error' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

const months = [
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

export function InvoicesPage() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()))
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [regenerateExisting, setRegenerateExisting] = useState(false)
  const queryClient = useQueryClient()

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const generateMutation = useMutation({
    mutationFn: ({ year, month, regenerate }: { year: number; month: number; regenerate: boolean }) => generateInvoices(year, month, regenerate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowGenerateModal(false)
      setGenerateError('')
      setRegenerateExisting(false)
    },
    onError: (err: Error) => {
      setGenerateError(err.message)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, paidDate }: { id: string; status: InvoiceStatus; paidDate?: string }) =>
      updateInvoiceStatus(id, status, paidDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentDate.getFullYear() - i),
    label: String(currentDate.getFullYear() - i),
  }))

  // Filter invoices by selected month/year
  const filteredInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.periodStart)
    return invDate.getMonth() + 1 === parseInt(selectedMonth) && invDate.getFullYear() === parseInt(selectedYear)
  })

  const totalUnpaid = invoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0)

  const totalPaidThisMonth = invoices
    .filter((inv) => {
      if (inv.status !== 'paid' || !inv.paidDate) return false
      const paidDate = new Date(inv.paidDate)
      return paidDate.getMonth() === currentDate.getMonth() && paidDate.getFullYear() === currentDate.getFullYear()
    })
    .reduce((sum, inv) => sum + inv.total, 0)

  const handleGenerate = () => {
    setGenerateError('')
    generateMutation.mutate({
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
      regenerate: regenerateExisting,
    })
  }

  const handleMarkPaid = (invoice: Invoice) => {
    updateStatusMutation.mutate({
      id: invoice.id,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
    })
  }

  const handleMarkSent = (invoice: Invoice) => {
    updateStatusMutation.mutate({
      id: invoice.id,
      status: 'sent',
    })
  }

  // Handle mark sent by invoice ID (for postMessage from invoice preview window)
  const handleMarkSentById = useCallback((invoiceId: string) => {
    updateStatusMutation.mutate({
      id: invoiceId,
      status: 'sent',
    })
  }, [updateStatusMutation])

  // Listen for messages from invoice preview window to mark as sent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MARK_INVOICE_SENT' && event.data?.invoiceId) {
        handleMarkSentById(event.data.invoiceId)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMarkSentById])

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm sm:text-base text-gray-500">Generate and manage invoices</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)} className="w-full sm:w-auto">
          Generate Invoices
        </Button>
      </div>

      {/* Stats - horizontal scroll on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-sm text-gray-500 uppercase">Total</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-sm text-gray-500 uppercase">Unpaid</p>
            <p className="text-lg sm:text-2xl font-bold text-amber-600">{formatCurrency(totalUnpaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-sm text-gray-500 uppercase">Paid</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalPaidThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-4">
            <Select
              label="Month"
              options={months}
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="flex-1 sm:flex-none sm:w-40"
            />
            <Select
              label="Year"
              options={years}
              value={selectedYear}
              onChange={setSelectedYear}
              className="flex-1 sm:flex-none sm:w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices list */}
      <Card>
        <CardHeader>
          <CardTitle>
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear} ({filteredInvoices.length} invoices)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-24" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load invoices. Please try again.
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No invoices for this period. Click "Generate Invoices" to create them.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onMarkPaid={handleMarkPaid}
                  onMarkSent={handleMarkSent}
                  onDownloadPdf={(inv) => generateInvoicePdf(inv, settings)}
                  isUpdating={updateStatusMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
          <Card className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 sm:border-0">
              <CardTitle className="text-lg sm:text-xl">Generate Invoices</CardTitle>
              <IconButton
                onClick={() => setShowGenerateModal(false)}
                className="-mr-2"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </IconButton>
            </CardHeader>
            <CardContent className="space-y-4 pb-6 sm:pb-4">
              <p className="text-sm text-gray-600">
                Generate invoices for all clients with sessions in the selected month.
              </p>
              <Select
                label="Month"
                options={months}
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
              <Select
                label="Year"
                options={years}
                value={selectedYear}
                onChange={setSelectedYear}
              />
              <Checkbox
                id="regenerate-existing"
                label="Regenerate existing invoices"
                description="Delete and recreate invoices for this month (use to fix issues or update rates)"
                checked={regenerateExisting}
                onChange={setRegenerateExisting}
              />
              {generateError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {generateError}
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowGenerateModal(false)} className="flex-1 h-11 sm:h-10">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="flex-1 h-11 sm:h-10"
                >
                  {generateMutation.isPending ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Generate printable invoice HTML
function generateInvoicePdf(invoice: Invoice, settings?: AppSettings) {
  const formatDateLong = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Use settings if available, otherwise use defaults
  const businessName = settings?.business.name || 'Your Business Name'
  const bankAccountName = settings?.bank.accountName || 'Your Business Name'
  const bankName = settings?.bank.bankName || 'Natwest'
  const sortCode = settings?.bank.sortCode || '00-00-00'
  const accountNumber = settings?.bank.accountNumber || '00000000'

  // Get the base URL for assets (works in both dev and production)
  const logoUrl = `${window.location.origin}/primary-logo.jpg`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      padding: 40px; 
      max-width: 800px; 
      margin: 0 auto;
      color: #1f2937;
      line-height: 1.5;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5761a;
    }
    .logo-img {
      height: 80px;
      width: auto;
    }
    .logo { 
      font-size: 28px; 
      font-weight: bold; 
      color: #e5761a;
    }
    .logo-subtitle { font-size: 14px; color: #6b7280; }
    .invoice-title { 
      font-size: 32px; 
      font-weight: bold; 
      text-align: right;
      color: #1f2937;
    }
    .invoice-number { 
      font-family: monospace; 
      font-size: 16px; 
      color: #6b7280;
      text-align: right;
    }
    .details { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 40px;
    }
    .details-section h3 { 
      font-size: 12px; 
      text-transform: uppercase; 
      color: #6b7280;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .details-section p { margin: 2px 0; }
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 30px;
    }
    .table th { 
      text-align: left; 
      padding: 12px 8px; 
      border-bottom: 2px solid #e5e7eb;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .table td { 
      padding: 12px 8px; 
      border-bottom: 1px solid #f3f4f6;
    }
    .table .amount { text-align: right; }
    .totals { 
      margin-left: auto; 
      width: 250px;
    }
    .totals-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0;
    }
    .totals-row.total { 
      font-size: 20px; 
      font-weight: bold; 
      border-top: 2px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 8px;
      color: #e5761a;
    }
    .footer { 
      margin-top: 60px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .payment-details { 
      background: #f9fafb; 
      padding: 20px; 
      border-radius: 8px;
      margin-top: 30px;
    }
    .payment-details h3 { 
      font-size: 14px; 
      margin-bottom: 12px;
      color: #1f2937;
    }
    @media print {
      body { padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
    }
    
    /* Also hide when printing via Safari export */
    @page { margin: 1cm; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${logoUrl}" alt="Logo" class="logo-img" />
      <div class="logo-subtitle" style="margin-top: 8px;">${bankAccountName}</div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${invoice.invoiceNumber}</div>
    </div>
  </div>

  <div class="details">
    <div class="details-section">
      <h3>Bill To</h3>
      <p><strong>${invoice.clientName}</strong></p>
      ${invoice.billingAddress.line1 ? `<p>${invoice.billingAddress.line1}</p>` : ''}
      ${invoice.billingAddress.line2 ? `<p>${invoice.billingAddress.line2}</p>` : ''}
      ${invoice.billingAddress.line3 ? `<p>${invoice.billingAddress.line3}</p>` : ''}
      ${invoice.billingAddress.postcode ? `<p>${invoice.billingAddress.postcode}</p>` : ''}
      <p>${invoice.billingEmail}</p>
    </div>
    <div class="details-section" style="text-align: right;">
      <h3>Invoice Details</h3>
      <p><strong>Date:</strong> ${formatDateLong(invoice.invoiceDate)}</p>
      <p><strong>Due:</strong> ${formatDateLong(invoice.dueDate)}</p>
      <p><strong>Period:</strong> ${formatDateLong(invoice.periodStart)} - ${formatDateLong(invoice.periodEnd)}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lineItems.map(item => `
        <tr>
          <td>${new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
          <td>${item.description}</td>
          <td class="amount">£${item.amount.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>£${invoice.subtotal.toFixed(2)}</span>
    </div>
    <div class="totals-row total">
      <span>Total:</span>
      <span>£${invoice.total.toFixed(2)}</span>
    </div>
  </div>

  <div class="payment-details">
    <h3>Payment Details</h3>
    <p>Please make payment by bank transfer to:</p>
    <p><strong>Account Name:</strong> ${bankAccountName}</p>
    <p><strong>Bank:</strong> ${bankName}</p>
    <p><strong>Sort Code:</strong> ${sortCode}</p>
    <p><strong>Account Number:</strong> ${accountNumber}</p>
    <p><strong>Reference:</strong> ${invoice.invoiceNumber}</p>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>${businessName}</p>
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: left;">
      <strong style="color: #92400e;">📧 To send this invoice by email:</strong>
      <ol style="margin: 8px 0 0 20px; color: #78350f;">
        <li>Click "Save as PDF" and save the file</li>
        <li>Click "Open Email" to create the email</li>
        <li>Attach the saved PDF to the email</li>
      </ol>
    </div>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <button onclick="savePdf()" style="background: #e5761a; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer;">
        1. Save as PDF
      </button>
      <button onclick="openEmail()" id="emailBtn" style="background: #2563eb; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer;">
        2. Open Email
      </button>
    </div>
    <p id="status" style="margin-top: 12px; color: #6b7280; font-size: 14px;"></p>
  </div>

  <script>
    let pdfSaved = false;
    let pageReady = false;
    
    // Wait for all images to load before enabling print
    function waitForImages() {
      return new Promise((resolve) => {
        const images = document.querySelectorAll('img');
        const totalImages = images.length;
        
        if (totalImages === 0) {
          resolve();
          return;
        }
        
        let loadedCount = 0;
        
        function checkComplete() {
          loadedCount++;
          if (loadedCount >= totalImages) {
            resolve();
          }
        }
        
        images.forEach((img) => {
          if (img.complete && img.naturalHeight !== 0) {
            checkComplete();
          } else {
            img.addEventListener('load', checkComplete);
            img.addEventListener('error', checkComplete);
          }
        });
      });
    }
    
    // Wait for window load and images
    window.addEventListener('load', function() {
      waitForImages().then(() => {
        pageReady = true;
      });
    });
    
    function savePdf() {
      const statusEl = document.getElementById('status');
      
      function doPrint() {
        // Give browser time to render
        setTimeout(() => {
          window.print();
          pdfSaved = true;
          statusEl.textContent = '✓ Now click "Open Email" and attach the saved PDF';
          statusEl.style.color = '#059669';
        }, 200);
      }
      
      if (!pageReady) {
        statusEl.textContent = 'Loading, please wait...';
        statusEl.style.color = '#f59e0b';
        waitForImages().then(doPrint);
      } else {
        doPrint();
      }
    }
    
    function openEmail() {
      if (!pdfSaved) {
        if (!confirm('You haven\\'t saved the PDF yet. The email will need the PDF attached manually.\\n\\nContinue anyway?')) {
          return;
        }
      }
      
      // Extract initials from invoice number (e.g., "202512-ChMo" -> "ChMo")
      const invoiceNumber = '${invoice.invoiceNumber}';
      const initials = invoiceNumber.split('-')[1] || invoiceNumber;
      
      // Build mailto link
      const email = '${invoice.billingEmail}';
      const subject = encodeURIComponent('Invoice ' + invoiceNumber);
      const body = encodeURIComponent('Hi,\\n\\nPlease find attached invoice ' + invoiceNumber + ' for ' + initials + '.\\n\\n' +
        '⚠️ REMINDER: Please attach the saved PDF file to this email before sending.\\n\\n' +
        'Kind regards');
      
      // Open email client
      window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
      
      // Notify parent window to mark invoice as sent
      if (window.opener) {
        window.opener.postMessage({
          type: 'MARK_INVOICE_SENT',
          invoiceId: '${invoice.id}'
        }, '*');
      }
      
      document.getElementById('status').textContent = '✓ Email opened - remember to attach the PDF!';
    }
  </script>
</body>
</html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}

interface InvoiceRowProps {
  invoice: Invoice
  onMarkPaid: (invoice: Invoice) => void
  onMarkSent: (invoice: Invoice) => void
  onDownloadPdf: (invoice: Invoice) => void
  isUpdating: boolean
}

function InvoiceRow({ invoice, onMarkPaid, onMarkSent, onDownloadPdf, isUpdating }: InvoiceRowProps) {
  const status = statusConfig[invoice.status]

  return (
    <div className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
      {/* Mobile: Card layout */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 text-sm truncate">{invoice.clientName}</p>
            <p className="font-mono text-xs text-gray-500">{invoice.invoiceNumber}</p>
          </div>
          <Badge variant={status.variant} className="text-[10px] flex-shrink-0">{status.label}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatDate(invoice.invoiceDate)}</span>
            <span>•</span>
            <span>{invoice.lineItems.length} sessions</span>
          </div>
          <p className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</p>
        </div>
        {/* Mobile actions */}
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-8 text-xs"
            onClick={() => onDownloadPdf(invoice)}
          >
            <DocumentArrowDownIcon className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => onMarkSent(invoice)}
              disabled={isUpdating}
            >
              <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
              Mark Sent
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => onMarkPaid(invoice)}
              disabled={isUpdating}
            >
              <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
              Mark Paid
            </Button>
          )}
        </div>
      </div>
      
      {/* Desktop: Row layout */}
      <div className="hidden sm:flex items-center gap-4">
        {/* Invoice number */}
        <div className="w-28">
          <p className="font-mono text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</p>
        </div>

        {/* Client */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{invoice.clientName}</p>
          <p className="text-sm text-gray-500">{invoice.lineItems.length} sessions</p>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</p>
        </div>

        {/* Status */}
        <Badge variant={status.variant}>{status.label}</Badge>

        {/* Actions */}
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" title="Download PDF" onClick={() => onDownloadPdf(invoice)}>
            <DocumentArrowDownIcon className="h-4 w-4" />
          </Button>
          {invoice.status === 'draft' && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Mark as Sent"
              onClick={() => onMarkSent(invoice)}
              disabled={isUpdating}
            >
              <CheckCircleIcon className="h-4 w-4 text-blue-500" />
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Mark as Paid"
              onClick={() => onMarkPaid(invoice)}
              disabled={isUpdating}
            >
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
