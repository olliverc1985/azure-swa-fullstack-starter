import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaff, createStaff, updateStaff, getUsers } from '@/services/api'
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
  FormActions,
  Select,
  useToast,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  UserIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import type { StaffMember, DayOfWeek, User } from '@/types'

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
] as const

export function StaffPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const queryClient = useQueryClient()

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: getStaff,
  })

  const filteredStaff = staff.filter((member) =>
    member.concatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddStaff = () => {
    setEditingStaff(null)
    setShowModal(true)
  }

  const handleEditStaff = (member: StaffMember) => {
    setEditingStaff(member)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingStaff(null)
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm sm:text-base text-gray-500">Manage your staff members and day rates</p>
        </div>
        <Button onClick={handleAddStaff} className="w-full sm:w-auto">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search staff by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff list */}
      <Card>
        <CardHeader>
          <CardTitle>All Staff ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load staff. Please try again.
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No staff match your search.' : 'No staff members yet. Add your first staff member!'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredStaff.map((member) => (
                <StaffRow key={member.id} staff={member} onEdit={handleEditStaff} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit staff modal */}
      {showModal && (
        <StaffModal
          staff={editingStaff}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal()
            queryClient.invalidateQueries({ queryKey: ['staff'] })
          }}
        />
      )}
    </div>
  )
}

function StaffRow({ staff, onEdit }: { staff: StaffMember; onEdit: (staff: StaffMember) => void }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 sm:gap-4 sm:items-center">
        {/* Avatar */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white font-semibold text-sm sm:text-base">
          {staff.firstName[0]}{staff.lastName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <p className="font-medium text-gray-900 text-sm sm:text-base">{staff.concatName}</p>
            <Badge variant={staff.isActive ? 'success' : 'outline'} className="text-[10px] sm:text-xs">
              {staff.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {staff.userId && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 border-blue-200">
                <LinkIcon className="h-3 w-3 mr-1" />
                Linked
              </Badge>
            )}
          </div>
          
          {/* Contact info */}
          <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
            {staff.email && (
              <a href={`mailto:${staff.email}`} className="flex items-center gap-1 hover:text-violet-600 transition-colors">
                <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{staff.email}</span>
              </a>
            )}
            {staff.phoneNumber && (
              <a href={`tel:${staff.phoneNumber}`} className="flex items-center gap-1 hover:text-violet-600 transition-colors">
                <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                {staff.phoneNumber}
              </a>
            )}
          </div>
          
          {/* Working days */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {staff.workingDays?.map((day) => (
              <span
                key={day}
                className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700"
              >
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </span>
            ))}
          </div>
        </div>

        {/* Rate & Actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(staff.dayRate)}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">per day</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEdit(staff)} className="h-8 px-2 sm:px-3">
            Edit
          </Button>
        </div>
      </div>
      
      {/* Mobile contact info */}
      <div className="sm:hidden mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
        {staff.email && (
          <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 hover:text-violet-600 transition-colors">
            <EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{staff.email}</span>
          </a>
        )}
        {staff.phoneNumber && (
          <a href={`tel:${staff.phoneNumber}`} className="flex items-center gap-1.5 hover:text-violet-600 transition-colors">
            <PhoneIcon className="h-3.5 w-3.5 flex-shrink-0" />
            {staff.phoneNumber}
          </a>
        )}
      </div>
    </div>
  )
}

interface StaffModalProps {
  staff: StaffMember | null
  onClose: () => void
  onSuccess: () => void
}

function StaffModal({ staff, onClose, onSuccess }: StaffModalProps) {
  const isEditing = !!staff
  const toast = useToast()
  const [formData, setFormData] = useState({
    firstName: staff?.firstName || '',
    lastName: staff?.lastName || '',
    email: staff?.email || '',
    phoneNumber: staff?.phoneNumber || '',
    dayRate: staff?.dayRate || 150,
    workingDays: staff?.workingDays || [] as DayOfWeek[],
    notes: staff?.notes || '',
    userId: staff?.userId || '',
    isActive: staff?.isActive ?? true,
  })
  const [error, setError] = useState('')

  // Fetch users for linking
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      toast.success('Staff member created successfully', 'Staff Created')
      onSuccess()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffMember> }) => updateStaff(id, data),
    onSuccess: () => {
      toast.success('Staff member updated successfully', 'Staff Updated')
      onSuccess()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First name, last name, and email are required')
      return
    }

    if (!formData.dayRate || formData.dayRate <= 0) {
      setError('A valid day rate is required')
      return
    }

    if (isEditing && staff) {
      updateMutation.mutate({ id: staff.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 sm:border-0">
          <CardTitle className="text-lg sm:text-xl">{isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}</CardTitle>
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
                label="Last Name *"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
              />
            </FormGrid>

            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />

            <FormGrid>
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="07123 456789"
              />
              <Input
                label="Day Rate (£) *"
                type="number"
                value={formData.dayRate}
                onChange={(e) => setFormData({ ...formData, dayRate: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1}
              />
            </FormGrid>

            {/* Link to User Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1.5" />
                Link to User Account
              </label>
              <Select
                value={formData.userId || ''}
                onChange={(value) => setFormData({ ...formData, userId: value || undefined })}
                options={[
                  { value: '', label: 'Not linked (admin check-in only)' },
                  ...users.map((user: User) => ({
                    value: user.id,
                    label: `${user.firstName} ${user.lastName} (${user.email})`,
                  })),
                ]}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Linking allows this person to check themselves in via the Staff Check-in page
              </p>
            </div>

            {/* Working Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formData.workingDays.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newDays = formData.workingDays.includes(day.value)
                        ? formData.workingDays.filter((d) => d !== day.value)
                        : [...formData.workingDays, day.value as DayOfWeek]
                      setFormData({ ...formData, workingDays: newDays })
                    }}
                    className="px-3 py-2"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Select the days this staff member typically works
              </p>
            </div>

            {/* Notes */}
            <Textarea
              label="Notes"
              rows={3}
              placeholder="Additional notes about this staff member..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active staff member
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
                {isEditing ? 'Save Changes' : 'Add Staff Member'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

