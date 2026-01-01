import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getClients, createClient, updateClient, deleteClient, getClientActivity } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Badge,
  Skeleton,
  Checkbox,
  IconButton,
  FormGrid,
  FormSection,
  FormActions,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { IncidentsList } from '@/components/incidents'
import { ClientNotes, ClientQuickView } from '@/components/clients'
import { EyeIcon } from '@heroicons/react/24/outline'
import type { Client, PaymentMethod, Address, EmergencyContact } from '@/types'

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [filterAtRisk, setFilterAtRisk] = useState(false)
  const queryClient = useQueryClient()

  // Check for filter query param
  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter === 'at-risk') {
      setFilterAtRisk(true)
    }
  }, [searchParams])

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  // Fetch at-risk clients when filter is active
  const { data: clientActivity } = useQuery({
    queryKey: ['client-activity-at-risk'],
    queryFn: () => getClientActivity(100, 14),
    enabled: filterAtRisk,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setDeletingClient(null)
    },
  })

  // Get IDs of at-risk clients
  const atRiskClientIds = new Set(clientActivity?.atRiskClients.map(c => c.clientId) || [])

  const filteredClients = clients.filter((client) => {
    // First apply search filter
    const matchesSearch = client.concatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Then apply at-risk filter if active
    if (filterAtRisk) {
      return matchesSearch && atRiskClientIds.has(client.id)
    }
    
    return matchesSearch
  })

  const handleAddClient = () => {
    setEditingClient(null)
    setShowModal(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingClient(null)
  }

  const handleDeleteClient = (client: Client) => {
    setDeletingClient(client)
  }

  const confirmDelete = () => {
    if (deletingClient) {
      deleteMutation.mutate(deletingClient.id)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm sm:text-base text-gray-500">Manage your clients and contacts</p>
        </div>
        <Button onClick={handleAddClient} className="w-full sm:w-auto">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* At-risk filter banner */}
      {filterAtRisk && (
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-800">
              Showing clients at risk (inactive 14+ days)
            </span>
            <Badge variant="warning">{atRiskClientIds.size}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterAtRisk(false)
              setSearchParams({})
            }}
            className="text-amber-700 hover:bg-amber-100"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear filter
          </Button>
        </div>
      )}

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search clients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients list */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients ({filteredClients.length})</CardTitle>
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
              Failed to load clients. Please try again.
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <ClientRow 
                  key={client.id} 
                  client={client} 
                  onEdit={handleEditClient} 
                  onView={setViewingClient}
                  onDelete={handleDeleteClient}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit client modal */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal()
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrashIcon className="h-5 w-5" />
                Delete Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{deletingClient.concatName}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All associated register entries and invoices will remain but won't be linked to this client.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeletingClient(null)}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="error"
                  onClick={confirmDelete}
                  isLoading={deleteMutation.isPending}
                  className="flex-1"
                >
                  Delete Client
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View client modal */}
      {viewingClient && (
        <ClientQuickView
          client={viewingClient}
          onClose={() => setViewingClient(null)}
        />
      )}
    </div>
  )
}

function ClientRow({ client, onEdit, onView, onDelete }: { client: Client; onEdit: (client: Client) => void; onView: (client: Client) => void; onDelete: (client: Client) => void }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      {/* Mobile: Card layout / Desktop: Row layout */}
      <div className="flex items-start gap-3 sm:gap-4 sm:items-center">
        {/* Avatar */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold text-sm sm:text-base">
          {client.firstName[0]}{client.surname[0]}
        </div>

        {/* Info - takes full width on mobile */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <p className="font-medium text-gray-900 text-sm sm:text-base truncate min-w-0 flex-1" title={client.concatName}>{client.concatName}</p>
            <Badge variant={client.isActive ? 'success' : 'outline'} className="text-[10px] sm:text-xs flex-shrink-0">
              {client.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {/* Contact info - hidden on mobile, shown on tablet+ */}
          <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{client.email}</span>
              </a>
            )}
            {client.contactNumber && (
              <a href={`tel:${client.contactNumber}`} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                {client.contactNumber}
              </a>
            )}
          </div>
          
          {/* Day badges */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {client.paymentMethod === 'cash' && (
              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                💷 Cash
              </span>
            )}
            {client.attendingDays?.map((day) => (
              <span
                key={day}
                className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700"
              >
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </span>
            ))}
          </div>
        </div>

        {/* Rate & Actions - stacked on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(client.rate)}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">per session</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onView(client)} className="h-10 px-3 sm:h-8 sm:px-2 touch-target" title="View client details">
              <EyeIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">View</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(client)} className="h-10 px-3 sm:h-8 sm:px-2 touch-target">
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(client)}
              className="h-10 px-3 sm:h-8 sm:px-2 text-red-600 hover:bg-red-50 hover:text-red-700 touch-target"
              title="Delete client"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile-only: contact info below */}
      <div className="sm:hidden mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
        {client.email && (
          <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
            <EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{client.email}</span>
          </a>
        )}
        {client.contactNumber && (
          <a href={`tel:${client.contactNumber}`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors">
            <PhoneIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {client.contactNumber}
          </a>
        )}
      </div>
    </div>
  )
}

interface ClientModalProps {
  client: Client | null
  onClose: () => void
  onSuccess: () => void
}

const DAYS_OF_WEEK = [
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
] as const

function ClientModal({ client, onClose, onSuccess }: ClientModalProps) {
  const isEditing = !!client
  const [formData, setFormData] = useState({
    firstName: client?.firstName || '',
    surname: client?.surname || '',
    dateOfBirth: client?.dateOfBirth || '',
    email: client?.email || '',
    contactNumber: client?.contactNumber || '',
    // Primary address
    addressLine1: client?.addressLine1 || '',
    addressLine2: client?.addressLine2 || '',
    addressLine3: client?.addressLine3 || '',
    addressLine4: client?.addressLine4 || '',
    postcode: client?.postcode || '',
    // Billing address
    useSeparateBillingAddress: client?.useSeparateBillingAddress || false,
    billingAddress: client?.billingAddress || { line1: '', line2: '', line3: '', line4: '', postcode: '' } as Address,
    // Invoice email
    invoiceEmail: client?.invoiceEmail || '',
    // Correspondence address
    useSeparateCorrespondenceAddress: client?.useSeparateCorrespondenceAddress || false,
    correspondenceAddress: client?.correspondenceAddress || { line1: '', line2: '', line3: '', line4: '', postcode: '' } as Address,
    // Emergency contact
    emergencyContact: client?.emergencyContact || { name: '', relationship: '', phoneNumber: '', email: '' } as EmergencyContact,
    rate: client?.rate || 40,
    importantInfo: client?.importantInfo || '',
    attendingDays: client?.attendingDays || [],
    paymentMethod: (client?.paymentMethod || 'invoice') as PaymentMethod,
    isActive: client?.isActive ?? true,
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => updateClient(id, data),
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName || !formData.surname || !formData.email) {
      setError('First name, surname, and email are required')
      return
    }

    if (isEditing && client) {
      updateMutation.mutate({ id: client.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 overscroll-contain">
      <Card className="w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 sm:border-0">
          <CardTitle className="text-lg sm:text-xl">{isEditing ? 'Edit Client' : 'Add New Client'}</CardTitle>
          <IconButton onClick={onClose} className="-mr-2" aria-label="Close modal">
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Details */}
            <FormGrid>
              <Input
                label="First Name *"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
              />
              <Input
                label="Surname *"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                placeholder="Surname"
              />
            </FormGrid>

            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />

            <Input
              label="Contact Number"
              type="tel"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              placeholder="07123 456789"
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="touch-target"
            />

            {/* Emergency Contact - Collapsible Section */}
            <FormSection
              title="Emergency Contact"
              icon={<ExclamationTriangleIcon className="h-4 w-4" />}
              variant="danger"
              collapsible
              defaultExpanded={!!formData.emergencyContact.name}
              badge={formData.emergencyContact.name && (
                <Badge variant="outline" className="ml-2 text-xs bg-red-100 text-red-700 border-red-300">
                  ✓ Added
                </Badge>
              )}
            >
              <FormGrid>
                <Input
                  label="Contact Name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                  })}
                  placeholder="Emergency contact name"
                />
                <Input
                  label="Relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                  })}
                  placeholder="e.g. Spouse, Partner, Manager"
                />
              </FormGrid>
              <FormGrid>
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.emergencyContact.phoneNumber}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    emergencyContact: { ...formData.emergencyContact, phoneNumber: e.target.value }
                  })}
                  placeholder="07123 456789"
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

            {/* Primary Address Section */}
            <FormSection
              title="Primary Address"
              icon={<HomeIcon className="h-4 w-4" />}
            >
              <Input
                label="Address Line 1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                placeholder="Street address"
              />
              <FormGrid>
                <Input
                  label="Address Line 2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Area"
                />
                <Input
                  label="Town/City"
                  value={formData.addressLine3}
                  onChange={(e) => setFormData({ ...formData, addressLine3: e.target.value })}
                  placeholder="Town or city"
                />
              </FormGrid>
              <FormGrid>
                <Input
                  label="County"
                  value={formData.addressLine4}
                  onChange={(e) => setFormData({ ...formData, addressLine4: e.target.value })}
                  placeholder="County"
                />
              <Input
                label="Postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="BH1 1AA"
              />
              </FormGrid>
            </FormSection>

            {/* Invoice Email (separate from main email) */}
            <FormSection
              title="Invoice Email"
              icon={<DocumentTextIcon className="h-4 w-4" />}
              variant="info"
              description="If different from main email"
            >
              <Input
                value={formData.invoiceEmail}
                onChange={(e) => setFormData({ ...formData, invoiceEmail: e.target.value })}
                placeholder="Leave blank to use main email"
                type="email"
              />
            </FormSection>

            {/* Billing Address - Collapsible Section */}
            <FormSection
              title="Separate Billing Address"
              icon={<DocumentTextIcon className="h-4 w-4" />}
              variant="info"
              collapsible
              defaultExpanded={formData.useSeparateBillingAddress}
              description="Use this if invoices should be sent to a different address"
              badge={formData.billingAddress.line1 && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-700 border-blue-300">
                  ✓ Added
                </Badge>
              )}
            >
              <Input
                label="Address Line 1"
                value={formData.billingAddress.line1 || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  billingAddress: { ...formData.billingAddress, line1: e.target.value },
                  useSeparateBillingAddress: true
                })}
                placeholder="Street address"
              />
              <FormGrid>
                <Input
                  label="Address Line 2"
                  value={formData.billingAddress.line2 || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    billingAddress: { ...formData.billingAddress, line2: e.target.value }
                  })}
                  placeholder="Area"
                />
                <Input
                  label="Town/City"
                  value={formData.billingAddress.line3 || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    billingAddress: { ...formData.billingAddress, line3: e.target.value }
                  })}
                  placeholder="Town or city"
                />
              </FormGrid>
              <FormGrid>
                <Input
                  label="County"
                  value={formData.billingAddress.line4 || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    billingAddress: { ...formData.billingAddress, line4: e.target.value }
                  })}
                  placeholder="County"
                />
                <Input
                  label="Postcode"
                  value={formData.billingAddress.postcode || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    billingAddress: { ...formData.billingAddress, postcode: e.target.value }
                  })}
                  placeholder="BH1 1AA"
                />
              </FormGrid>
            </FormSection>

            {/* Correspondence Address - Collapsible Section */}
            <FormSection
              title="Separate Correspondence Address"
              icon={<ShieldCheckIcon className="h-4 w-4" />}
              variant="success"
              collapsible
              defaultExpanded={formData.useSeparateCorrespondenceAddress}
              description="Use this for correspondence purposes if different from primary address"
              badge={formData.correspondenceAddress.line1 && (
                <Badge variant="outline" className="ml-2 text-xs bg-purple-100 text-purple-700 border-purple-300">
                  ✓ Added
                </Badge>
              )}
            >
              <Input
                label="Address Line 1"
                value={formData.correspondenceAddress.line1 || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  correspondenceAddress: { ...formData.correspondenceAddress, line1: e.target.value },
                  useSeparateCorrespondenceAddress: true
                })}
                placeholder="Street address"
              />
              <FormGrid>
                <Input
                  label="Address Line 2"
                  value={formData.correspondenceAddress.line2 || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    correspondenceAddress: { ...formData.correspondenceAddress, line2: e.target.value }
                  })}
                  placeholder="Area"
                />
                <Input
                  label="Town/City"
                  value={formData.correspondenceAddress.line3 || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    correspondenceAddress: { ...formData.correspondenceAddress, line3: e.target.value }
                  })}
                  placeholder="Town or city"
                />
              </FormGrid>
              <FormGrid>
                <Input
                  label="County"
                  value={formData.correspondenceAddress.line4 || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    correspondenceAddress: { ...formData.correspondenceAddress, line4: e.target.value }
                  })}
                  placeholder="County"
                />
                <Input
                  label="Postcode"
                  value={formData.correspondenceAddress.postcode || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    correspondenceAddress: { ...formData.correspondenceAddress, postcode: e.target.value }
                  })}
                  placeholder="BH1 1AA"
                />
              </FormGrid>
            </FormSection>

            <Input
              label="Rate per Session (£)"
              type="number"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
              min={0}
              step={1}
            />

            {/* Important Information */}
            <Textarea
              label="⚠️ Important Information"
              variant="warning"
              rows={3}
              placeholder="Special requirements, preferences, notes, etc."
              value={formData.importantInfo}
              onChange={(e) => setFormData({ ...formData, importantInfo: e.target.value })}
              helperText="This will be shown as an alert when marking attendance"
            />

            {/* Attending Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attending Days
              </label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formData.attendingDays.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newDays = formData.attendingDays.includes(day.value)
                        ? formData.attendingDays.filter((d) => d !== day.value)
                        : [...formData.attendingDays, day.value]
                      setFormData({ ...formData, attendingDays: newDays })
                    }}
                    className="px-3 py-2.5 sm:py-1.5"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Select the days this client typically attends
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formData.paymentMethod === 'invoice' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, paymentMethod: 'invoice' })}
                  className="px-3 py-3 sm:py-2.5"
                >
                  📄 Invoice
                </Button>
                <Button
                  type="button"
                  variant={formData.paymentMethod === 'cash' ? 'success' : 'outline'}
                  onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                  className="px-3 py-3 sm:py-2.5"
                >
                  💷 Cash
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {formData.paymentMethod === 'cash' 
                  ? 'Client always pays cash - sessions won\'t appear on invoices'
                  : 'Sessions added to monthly invoice (can pay cash for individual sessions)'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active client
              </label>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <FormActions>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 sm:h-10">
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading} className="flex-1 h-11 sm:h-10">
                {isEditing ? 'Save Changes' : 'Add Client'}
              </Button>
            </FormActions>
          </form>

          {/* Incident Reports & Notes - Outside form to avoid nested form issues */}
          {isEditing && client && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <IncidentsList client={client} compact />
              <ClientNotes client={client} compact />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
