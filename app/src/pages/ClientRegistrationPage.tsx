import { useState, useRef } from 'react'
import { submitClientRegistration } from '@/services/api'
import { appConfig } from '@/config/app.config'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Textarea,
  Alert,
  FormGrid,
  FormSection,
  FormActions,
  Checkbox,
} from '@/components/ui'
import {
  ExclamationTriangleIcon,
  HomeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import type { ClientRegistrationFormData, Address } from '@/types'

export function ClientRegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Security: Track form load time to detect bots
  const formLoadTime = useRef(Date.now())
  
  // Security: Honeypot field - should remain empty (bots fill all fields)
  const [honeypot, setHoneypot] = useState('')
  
  const [formData, setFormData] = useState<ClientRegistrationFormData>({
    firstName: '',
    surname: '',
    dateOfBirth: '',
    email: '',
    contactNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    addressLine4: '',
    postcode: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phoneNumber: '',
      email: '',
    },
    importantInfo: '',
    photoConsent: false,
    invoiceEmail: '',
    billingAddress: { line1: '', line2: '', line3: '', line4: '', postcode: '' } as Address,
    useSeparateBillingAddress: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Include security fields with the submission
      await submitClientRegistration({
        ...formData,
        // Security fields - these are stripped/handled server-side
        _honeypot: honeypot,
        _formLoadTime: formLoadTime.current,
      } as ClientRegistrationFormData & { _honeypot: string; _formLoadTime: number })
      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit registration. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirmation page after successful submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100/70 via-slate-50 to-accent-50/30 p-4 overflow-x-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-slate-200/25 blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center animate-slide-down">
            <img 
              src={appConfig.logo.path}
              alt={appConfig.logo.alt}
              className="mx-auto mb-4 h-32 w-auto object-contain drop-shadow-xl"
            />
          </div>

          <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl animate-slide-up text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-4">
                Your registration has been submitted successfully.
              </p>
              <p className="text-gray-500 text-sm">
                We'll review your details and be in touch shortly.
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  If you have any questions, please contact us.
                </p>
              </div>
            </CardContent>
          </Card>

          {appConfig.owner.showInFooter && (appConfig.owner.name || appConfig.owner.company) && (
            <p className="mt-6 text-center text-sm text-gray-500">
              {appConfig.owner.name}{appConfig.owner.name && appConfig.owner.company ? ' trading as ' : ''}{appConfig.owner.company}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/70 via-slate-50 to-accent-50/30 overflow-x-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-slate-200/25 blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-slate-300/20 blur-3xl animate-pulse-soft" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="mx-auto max-w-2xl">
          {/* Header with Logo */}
          <div className="mb-8 text-center animate-slide-down">
            <img 
              src={appConfig.logo.path}
              alt={appConfig.logo.alt}
              className="mx-auto mb-4 h-28 w-auto object-contain drop-shadow-xl"
            />
            <h1 className="font-display text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-500 via-slate-400 to-accent-400 bg-clip-text text-transparent">
              Client Registration
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome! Please complete this form to register.
            </p>
          </div>

          {/* Registration Form */}
          <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl animate-slide-up">
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>
                Fields marked with * are required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {/* Honeypot field - hidden from users, bots will fill it */}
                {/* Using opacity-0 h-0 overflow-hidden instead of absolute left to avoid mobile zoom issues */}
                <div className="opacity-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Personal Details */}
                <FormSection title="Personal Details" icon={<span>👤</span>}>
                  <FormGrid>
                    <Input
                      label="First Name *"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First name"
                      required
                    />
                    <Input
                      label="Surname *"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      placeholder="Surname"
                      required
                    />
                  </FormGrid>

                  <Input
                    label="Date of Birth *"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                  />

                  <FormGrid>
                    <Input
                      label="Email Address *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                    />
                    <Input
                      label="Contact Number *"
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="07123 456789"
                      required
                    />
                  </FormGrid>
                </FormSection>

                {/* Address */}
                <FormSection title="Address" icon={<HomeIcon className="h-4 w-4" />}>
                  <Input
                    label="Address Line 1 *"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="Street address"
                    required
                  />
                  <Input
                    label="Address Line 2"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Flat, building, area (optional)"
                  />
                  <FormGrid>
                    <Input
                      label="Town/City *"
                      value={formData.addressLine3}
                      onChange={(e) => setFormData({ ...formData, addressLine3: e.target.value })}
                      placeholder="Town or city"
                      required
                    />
                    <Input
                      label="County"
                      value={formData.addressLine4}
                      onChange={(e) => setFormData({ ...formData, addressLine4: e.target.value })}
                      placeholder="County (optional)"
                    />
                  </FormGrid>
                  <Input
                    label="Postcode *"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    placeholder="BH1 1AA"
                    required
                    className="max-w-[200px]"
                  />
                </FormSection>

                {/* Emergency Contact */}
                <FormSection
                  title="Emergency Contact"
                  icon={<ExclamationTriangleIcon className="h-4 w-4" />}
                  variant="danger"
                  description="Please provide details of someone we can contact in case of emergency"
                >
                  <FormGrid>
                    <Input
                      label="Contact Name *"
                      value={formData.emergencyContact.name}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                      })}
                      placeholder="Full name"
                      required
                    />
                    <Input
                      label="Relationship *"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                      })}
                      placeholder="e.g. Spouse, Partner, Manager"
                      required
                    />
                  </FormGrid>
                  <FormGrid>
                    <Input
                      label="Phone Number *"
                      type="tel"
                      value={formData.emergencyContact.phoneNumber}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        emergencyContact: { ...formData.emergencyContact, phoneNumber: e.target.value }
                      })}
                      placeholder="07123 456789"
                      required
                    />
                    <Input
                      label="Email (optional)"
                      type="email"
                      value={formData.emergencyContact.email || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        emergencyContact: { ...formData.emergencyContact, email: e.target.value }
                      })}
                      placeholder="email@example.com"
                    />
                  </FormGrid>
                </FormSection>

                {/* Important Information */}
                <FormSection
                  title="Important Information"
                  icon={<span>⚠️</span>}
                  variant="warning"
                  description="Please share any important information we should know"
                >
                  <Textarea
                    rows={4}
                    placeholder="e.g. Special requirements, preferences, important notes, or any other relevant information..."
                    value={formData.importantInfo}
                    onChange={(e) => setFormData({ ...formData, importantInfo: e.target.value })}
                  />
                </FormSection>

                {/* Photo Consent */}
                <FormSection
                  title="Photo Consent"
                  icon={<CameraIcon className="h-4 w-4" />}
                  variant="default"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="photoConsent"
                      checked={formData.photoConsent}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        photoConsent: !!checked 
                      })}
                      className="mt-0.5"
                    />
                    <div>
                      <label htmlFor="photoConsent" className="text-sm font-medium text-gray-700 cursor-pointer">
                        I consent to photos being used on social media
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        We occasionally share photos from our sessions on social media to celebrate achievements 
                        and showcase our activities. You can withdraw consent at any time.
                      </p>
                    </div>
                  </div>
                </FormSection>

                {/* Billing Details (Collapsible) */}
                <FormSection
                  title="Different Billing Details?"
                  icon={<DocumentTextIcon className="h-4 w-4" />}
                  variant="info"
                  collapsible
                  defaultExpanded={false}
                  description="Only complete this if invoices should be sent to a different email or address"
                >
                  <Input
                    label="Invoice Email (if different from your email)"
                    type="email"
                    value={formData.invoiceEmail}
                    onChange={(e) => setFormData({ ...formData, invoiceEmail: e.target.value })}
                    placeholder="Leave blank to use your email address"
                  />
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                      id="useSeparateBillingAddress"
                      checked={formData.useSeparateBillingAddress}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        useSeparateBillingAddress: !!checked 
                      })}
                    />
                    <label htmlFor="useSeparateBillingAddress" className="text-sm text-gray-700">
                      Use a different billing address
                    </label>
                  </div>

                  {formData.useSeparateBillingAddress && (
                    <div className="mt-3 space-y-3">
                      <Input
                        label="Billing Address Line 1"
                        value={formData.billingAddress?.line1 || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billingAddress: { ...formData.billingAddress, line1: e.target.value }
                        })}
                        placeholder="Street address"
                      />
                      <Input
                        label="Billing Address Line 2"
                        value={formData.billingAddress?.line2 || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billingAddress: { ...formData.billingAddress, line2: e.target.value }
                        })}
                        placeholder="Flat, building, area"
                      />
                      <FormGrid>
                        <Input
                          label="Billing Town/City"
                          value={formData.billingAddress?.line3 || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            billingAddress: { ...formData.billingAddress, line3: e.target.value }
                          })}
                          placeholder="Town or city"
                        />
                        <Input
                          label="Billing County"
                          value={formData.billingAddress?.line4 || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            billingAddress: { ...formData.billingAddress, line4: e.target.value }
                          })}
                          placeholder="County"
                        />
                      </FormGrid>
                      <Input
                        label="Billing Postcode"
                        value={formData.billingAddress?.postcode || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billingAddress: { ...formData.billingAddress, postcode: e.target.value }
                        })}
                        placeholder="BH1 1AA"
                        className="max-w-[200px]"
                      />
                    </div>
                  )}
                </FormSection>

                {/* Privacy Notice */}
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  <p>
                    🔒 Your information is stored securely and used only for the purposes of your registration. 
                    We will never share your details with third parties.
                  </p>
                </div>

                <FormActions>
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    Submit Registration
                  </Button>
                </FormActions>
              </form>
            </CardContent>
          </Card>

          {appConfig.owner.showInFooter && (appConfig.owner.name || appConfig.owner.company) && (
            <p className="mt-6 text-center text-sm text-gray-500">
              {appConfig.owner.name}{appConfig.owner.name && appConfig.owner.company ? ' trading as ' : ''}{appConfig.owner.company}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}






