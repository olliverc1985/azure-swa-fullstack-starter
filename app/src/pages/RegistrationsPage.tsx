import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRegistrations, updateRegistration, deleteRegistration } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Textarea,
  FormActions,
  IconButton,
} from '@/components/ui'
import {
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  TrashIcon,
  EyeIcon,
  HomeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import type { ClientRegistration } from '@/types'

export function RegistrationsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')
  const [viewingRegistration, setViewingRegistration] = useState<ClientRegistration | null>(null)
  const [deletingRegistration, setDeletingRegistration] = useState<ClientRegistration | null>(null)
  const queryClient = useQueryClient()

  const { data: registrations = [], isLoading, error } = useQuery({
    queryKey: ['registrations', filter],
    queryFn: () => getRegistrations(filter === 'all' ? undefined : filter === 'reviewed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientRegistration> }) => 
      updateRegistration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      setDeletingRegistration(null)
    },
  })

  const handleMarkReviewed = (registration: ClientRegistration) => {
    updateMutation.mutate({ id: registration.id, data: { reviewed: true } })
  }

  const pendingCount = registrations.filter(r => !r.reviewed).length

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Client Registrations</h1>
          <p className="text-sm sm:text-base text-gray-500">
            Review and manage client registration submissions
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="self-start sm:self-auto">
            {pendingCount} pending review
          </Badge>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          <ClockIcon className="h-4 w-4 mr-1" />
          Pending
        </Button>
        <Button
          variant={filter === 'reviewed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('reviewed')}
        >
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Reviewed
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {/* Registrations list */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'pending' ? 'Pending Registrations' : filter === 'reviewed' ? 'Reviewed Registrations' : 'All Registrations'}
            {' '}({registrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load registrations. Please try again.
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {filter === 'pending' 
                ? 'No pending registrations. All caught up! 🎉'
                : filter === 'reviewed'
                ? 'No reviewed registrations yet.'
                : 'No registrations yet.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {registrations.map((registration) => (
                <RegistrationRow
                  key={registration.id}
                  registration={registration}
                  onView={setViewingRegistration}
                  onMarkReviewed={handleMarkReviewed}
                  onDelete={setDeletingRegistration}
                  isUpdating={updateMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View registration modal */}
      {viewingRegistration && (
        <RegistrationDetailModal
          registration={viewingRegistration}
          onClose={() => setViewingRegistration(null)}
          onMarkReviewed={handleMarkReviewed}
          onUpdateNotes={(notes) => {
            updateMutation.mutate({ 
              id: viewingRegistration.id, 
              data: { notes } 
            })
          }}
          isUpdating={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation modal */}
      {deletingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrashIcon className="h-5 w-5" />
                Delete Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete the registration for{' '}
                <strong>{deletingRegistration.firstName} {deletingRegistration.surname}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeletingRegistration(null)}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="error"
                  onClick={() => deleteMutation.mutate(deletingRegistration.id)}
                  isLoading={deleteMutation.isPending}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface RegistrationRowProps {
  registration: ClientRegistration
  onView: (registration: ClientRegistration) => void
  onMarkReviewed: (registration: ClientRegistration) => void
  onDelete: (registration: ClientRegistration) => void
  isUpdating: boolean
}

function RegistrationRow({ registration, onView, onMarkReviewed, onDelete, isUpdating }: RegistrationRowProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 sm:gap-4 sm:items-center">
        {/* Avatar */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold text-sm sm:text-base">
          {registration.firstName[0]}{registration.surname[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <p className="font-medium text-gray-900 text-sm sm:text-base truncate min-w-0 flex-1" title={`${registration.firstName} ${registration.surname}`}>
              {registration.firstName} {registration.surname}
            </p>
            <Badge variant={registration.reviewed ? 'success' : 'warning'} className="text-[10px] sm:text-xs flex-shrink-0">
              {registration.reviewed ? 'Reviewed' : 'Pending'}
            </Badge>
            {registration.photoConsent && (
              <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs text-green-600 flex-shrink-0" title="Photo consent given">
                📷 <span className="hidden sm:inline">Photo OK</span>
              </span>
            )}
          </div>
          
          {/* Contact info */}
          <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
            <a href={`mailto:${registration.email}`} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
              <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{registration.email}</span>
            </a>
            <a href={`tel:${registration.contactNumber}`} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
              <PhoneIcon className="h-4 w-4 flex-shrink-0" />
              {registration.contactNumber}
            </a>
          </div>

          {/* Submitted date */}
          <p className="text-xs text-gray-400 mt-1">
            Submitted {formatDate(registration.submittedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onView(registration)} 
              className="h-8 px-2 sm:px-3"
            >
              <EyeIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">View</span>
            </Button>
            {!registration.reviewed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkReviewed(registration)}
                disabled={isUpdating}
                className="h-8 px-2 sm:px-3"
              >
                <CheckCircleIcon className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Mark Reviewed</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(registration)}
              className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile contact info */}
      <div className="sm:hidden mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
        <a href={`mailto:${registration.email}`} className="flex items-center gap-1.5 hover:text-primary-600">
          <EnvelopeIcon className="h-3.5 w-3.5" />
          <span className="truncate">{registration.email}</span>
        </a>
        <a href={`tel:${registration.contactNumber}`} className="flex items-center gap-1.5 hover:text-primary-600">
          <PhoneIcon className="h-3.5 w-3.5" />
          {registration.contactNumber}
        </a>
      </div>
    </div>
  )
}

interface RegistrationDetailModalProps {
  registration: ClientRegistration
  onClose: () => void
  onMarkReviewed: (registration: ClientRegistration) => void
  onUpdateNotes: (notes: string) => void
  isUpdating: boolean
}

function RegistrationDetailModal({ 
  registration, 
  onClose, 
  onMarkReviewed,
  onUpdateNotes,
  isUpdating 
}: RegistrationDetailModalProps) {
  const [notes, setNotes] = useState(registration.notes || '')
  const [hasChanges, setHasChanges] = useState(false)

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setHasChanges(value !== (registration.notes || ''))
  }

  const handleSaveNotes = () => {
    onUpdateNotes(notes)
    setHasChanges(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDOB = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <Card className="w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100">
          <div>
            <CardTitle className="text-lg sm:text-xl">
              {registration.firstName} {registration.surname}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Submitted {formatDate(registration.submittedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={registration.reviewed ? 'success' : 'warning'}>
              {registration.reviewed ? 'Reviewed' : 'Pending'}
            </Badge>
            <IconButton onClick={onClose} aria-label="Close modal">
              <XMarkIcon className="h-5 w-5" />
            </IconButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Details */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span>👤</span> Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Full Name</p>
                <p className="font-medium">{registration.firstName} {registration.surname}</p>
              </div>
              <div>
                <p className="text-gray-500">Date of Birth</p>
                <p className="font-medium">{formatDOB(registration.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <a href={`mailto:${registration.email}`} className="font-medium text-primary-600 hover:underline">
                  {registration.email}
                </a>
              </div>
              <div>
                <p className="text-gray-500">Contact Number</p>
                <a href={`tel:${registration.contactNumber}`} className="font-medium text-primary-600 hover:underline">
                  {registration.contactNumber}
                </a>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <HomeIcon className="h-4 w-4" /> Address
            </h3>
            <div className="text-sm">
              <p>{registration.addressLine1}</p>
              {registration.addressLine2 && <p>{registration.addressLine2}</p>}
              <p>{registration.addressLine3}</p>
              {registration.addressLine4 && <p>{registration.addressLine4}</p>}
              <p className="font-medium">{registration.postcode}</p>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" /> Emergency Contact
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-red-600">Name</p>
                <p className="font-medium text-gray-900">{registration.emergencyContact.name}</p>
              </div>
              <div>
                <p className="text-red-600">Relationship</p>
                <p className="font-medium text-gray-900">{registration.emergencyContact.relationship}</p>
              </div>
              <div>
                <p className="text-red-600">Phone</p>
                <a href={`tel:${registration.emergencyContact.phoneNumber}`} className="font-medium text-primary-600 hover:underline">
                  {registration.emergencyContact.phoneNumber}
                </a>
              </div>
              {registration.emergencyContact.email && (
                <div>
                  <p className="text-red-600">Email</p>
                  <a href={`mailto:${registration.emergencyContact.email}`} className="font-medium text-primary-600 hover:underline">
                    {registration.emergencyContact.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Important Information */}
          {registration.importantInfo && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                ⚠️ Important Information
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{registration.importantInfo}</p>
            </div>
          )}

          {/* Photo Consent */}
          <div className={`rounded-lg p-4 ${registration.photoConsent ? 'border border-green-200 bg-green-50' : 'border border-gray-200 bg-gray-50'}`}>
            <h3 className={`font-medium mb-1 flex items-center gap-2 ${registration.photoConsent ? 'text-green-800' : 'text-gray-700'}`}>
              📷 Photo Consent
            </h3>
            <p className="text-sm">
              {registration.photoConsent ? (
                <span className="text-green-700 font-medium">✓ Consent given for social media photos</span>
              ) : (
                <span className="text-gray-600">✗ No consent for social media photos</span>
              )}
            </p>
          </div>

          {/* Billing Details */}
          {(registration.invoiceEmail || registration.useSeparateBillingAddress) && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                📄 Billing Details
              </h3>
              <div className="text-sm space-y-2">
                {registration.invoiceEmail && (
                  <div>
                    <p className="text-gray-500">Invoice Email</p>
                    <a href={`mailto:${registration.invoiceEmail}`} className="font-medium text-primary-600 hover:underline">
                      {registration.invoiceEmail}
                    </a>
                  </div>
                )}
                {registration.useSeparateBillingAddress && registration.billingAddress && (
                  <div>
                    <p className="text-gray-500">Billing Address</p>
                    <div className="font-medium">
                      {registration.billingAddress.line1 && <p>{registration.billingAddress.line1}</p>}
                      {registration.billingAddress.line2 && <p>{registration.billingAddress.line2}</p>}
                      {registration.billingAddress.line3 && <p>{registration.billingAddress.line3}</p>}
                      {registration.billingAddress.line4 && <p>{registration.billingAddress.line4}</p>}
                      {registration.billingAddress.postcode && <p>{registration.billingAddress.postcode}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Admin Notes</h3>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this registration..."
            />
            {hasChanges && (
              <div className="mt-2">
                <Button size="sm" onClick={handleSaveNotes} isLoading={isUpdating}>
                  Save Notes
                </Button>
              </div>
            )}
          </div>

          {/* Security Metadata (Admin info) */}
          {(registration.submissionIp || registration.userAgent) && (
            <div className="text-xs text-gray-400 border-t border-gray-100 pt-4 mt-4">
              <p className="font-medium text-gray-500 mb-1">Submission Details</p>
              {registration.submissionIp && (
                <p>IP: {registration.submissionIp}</p>
              )}
              {registration.userAgent && (
                <p className="truncate" title={registration.userAgent}>
                  User Agent: {registration.userAgent.substring(0, 80)}...
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <FormActions>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!registration.reviewed && (
              <Button 
                onClick={() => onMarkReviewed(registration)} 
                isLoading={isUpdating}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Mark as Reviewed
              </Button>
            )}
          </FormActions>
        </CardContent>
      </Card>
    </div>
  )
}







