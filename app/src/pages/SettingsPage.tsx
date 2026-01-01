import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSettings, updateSettings, changePassword } from '@/services/api'
import type { AppSettings } from '@/types'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Alert,
} from '@/components/ui'
import {
  BuildingOfficeIcon,
  BanknotesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    { id: 'business', label: 'Business', fullLabel: 'Business Details', icon: BuildingOfficeIcon },
    { id: 'rates', label: 'Rates', fullLabel: 'Session Rates', icon: BanknotesIcon },
    { id: 'security', label: 'Security', fullLabel: 'Security', icon: ShieldCheckIcon },
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getSettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm sm:text-base text-gray-500">Manage your business settings</p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Mobile: Horizontal scrollable tabs */}
      <div className="lg:hidden -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-4">
        {/* Desktop: Vertical sidebar tabs */}
        <Card className="hidden lg:block lg:col-span-1 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.fullLabel}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {activeTab === 'business' && settings && (
            <BusinessSettings settings={settings} onUpdate={setSettings} />
          )}
          {activeTab === 'rates' && settings && (
            <RatesSettings settings={settings} onUpdate={setSettings} />
          )}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  )
}

interface SettingsTabProps {
  settings: AppSettings
  onUpdate: (settings: AppSettings) => void
}

function BusinessSettings({ settings, onUpdate }: SettingsTabProps) {
  const [formData, setFormData] = useState({
    businessName: settings.business.name,
    addressLine1: settings.business.addressLine1,
    addressLine2: settings.business.addressLine2 || '',
    city: settings.business.city,
    county: settings.business.county,
    postcode: settings.business.postcode,
    accountName: settings.bank.accountName,
    bankName: settings.bank.bankName,
    sortCode: settings.bank.sortCode,
    accountNumber: settings.bank.accountNumber,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(false)

      const updated = await updateSettings({
        business: {
          name: formData.businessName,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city,
          county: formData.county,
          postcode: formData.postcode,
        },
        bank: {
          accountName: formData.accountName,
          bankName: formData.bankName,
          sortCode: formData.sortCode,
          accountNumber: formData.accountNumber,
        },
      })

      onUpdate(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Business Details</CardTitle>
        <CardDescription>Information displayed on invoices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            Settings saved successfully!
          </Alert>
        )}

        <Input
          label="Business Name"
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
        />
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Input
            label="Address Line 1"
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
          />
          <Input
            label="Address Line 2"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
          <Input
            label="Town/City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <Input
            label="County"
            value={formData.county}
            onChange={(e) => setFormData({ ...formData, county: e.target.value })}
          />
          <Input
            label="Postcode"
            value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
          />
        </div>

        <hr className="my-4" />
        <h4 className="font-medium text-gray-900 text-sm sm:text-base">Bank Details</h4>
        <p className="text-xs text-gray-500 -mt-2">These details will appear on invoices for payment</p>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Input
            label="Account Name"
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          />
          <Input
            label="Bank Name"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Input
            label="Sort Code"
            value={formData.sortCode}
            onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
          />
          <Input
            label="Account Number"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RatesSettings({ settings, onUpdate }: SettingsTabProps) {
  const [formData, setFormData] = useState({
    standard: settings.rates.standard,
    reduced: settings.rates.reduced,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(false)

      const updated = await updateSettings({
        rates: {
          standard: formData.standard,
          reduced: formData.reduced,
        },
      })

      onUpdate(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Session Rates</CardTitle>
        <CardDescription>Configure default rates for sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            Rates saved successfully!
          </Alert>
        )}

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Input
            label="Standard Rate (£)"
            type="number"
            value={formData.standard}
            onChange={(e) => setFormData({ ...formData, standard: parseFloat(e.target.value) || 0 })}
            helperText="Default rate for new clients"
          />
          <Input
            label="Reduced Rate (£)"
            type="number"
            value={formData.reduced}
            onChange={(e) => setFormData({ ...formData, reduced: parseFloat(e.target.value) || 0 })}
            helperText="Discounted rate for eligible clients"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SecuritySettings() {
  const { logout } = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChangePassword = async () => {
    try {
      setError(null)
      setSuccess(false)

      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        setError('All fields are required')
        return
      }

      if (formData.newPassword.length < 8) {
        setError('New password must be at least 8 characters')
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match')
        return
      }

      setIsSaving(true)

      await changePassword(formData.currentPassword, formData.newPassword)

      setSuccess(true)
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })

      // Log out after 2 seconds so user can see success message
      setTimeout(() => {
        logout()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Security</CardTitle>
        <CardDescription>Manage your account security</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            Password changed successfully! You will be logged out shortly...
          </Alert>
        )}

        <div>
          <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Change Password</h4>
          <div className="space-y-3">
            <Input
              type="password"
              label="Current Password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            />
            <Input
              type="password"
              label="New Password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              helperText="Minimum 8 characters"
            />
            <Input
              type="password"
              label="Confirm New Password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleChangePassword} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
