import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { getClientNotes } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Skeleton,
} from '@/components/ui'
import {
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import type { Client, ClientNoteType } from '@/types'
import { CLIENT_NOTE_TYPE_LABELS } from '@/types'

const NOTE_TYPE_ICONS: Record<ClientNoteType, string> = {
  general: '📝',
  requirements: '📋',
  preferences: '⭐',
  billing: '💳',
  feedback: '💬',
  follow_up: '📅',
  other: '📝',
}

const NOTE_TYPE_COLORS: Record<ClientNoteType, string> = {
  general: 'bg-blue-50 border-blue-200',
  requirements: 'bg-orange-50 border-orange-200',
  preferences: 'bg-yellow-50 border-yellow-200',
  billing: 'bg-purple-50 border-purple-200',
  feedback: 'bg-slate-50 border-slate-200',
  follow_up: 'bg-green-50 border-green-200',
  other: 'bg-gray-50 border-gray-200',
}

interface ClientQuickViewProps {
  client: Client
  onClose: () => void
}

export function ClientQuickView({ client, onClose }: ClientQuickViewProps) {
  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['client-notes', client.id],
    queryFn: () => getClientNotes(client.id),
  })

  const formatAddress = (
    line1?: string,
    line2?: string,
    line3?: string,
    line4?: string,
    postcode?: string
  ) => {
    return [line1, line2, line3, line4, postcode].filter(Boolean).join(', ')
  }

  const primaryAddress = formatAddress(
    client.addressLine1,
    client.addressLine2,
    client.addressLine3,
    client.addressLine4,
    client.postcode
  )

  const billingAddress = client.useSeparateBillingAddress && client.billingAddress
    ? formatAddress(
        client.billingAddress.line1,
        client.billingAddress.line2,
        client.billingAddress.line3,
        client.billingAddress.line4,
        client.billingAddress.postcode
      )
    : null

  const correspondenceAddress = client.useSeparateCorrespondenceAddress && client.correspondenceAddress
    ? formatAddress(
        client.correspondenceAddress.line1,
        client.correspondenceAddress.line2,
        client.correspondenceAddress.line3,
        client.correspondenceAddress.line4,
        client.correspondenceAddress.postcode
      )
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold text-lg">
              {client.firstName[0]}{client.surname[0]}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate" title={client.concatName}>{client.concatName}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={client.isActive ? 'success' : 'outline'} className="text-xs">
                  {client.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {client.paymentMethod === 'cash' && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700">💷 Cash</Badge>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 -mr-2">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Important Info Alert */}
          {client.importantInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Important Information
              </div>
              <p className="text-amber-700 text-sm whitespace-pre-wrap">{client.importantInfo}</p>
            </div>
          )}

          {/* Date of Birth */}
          {client.dateOfBirth && (
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</p>
                <p className="text-gray-900 font-medium">
                  {format(new Date(client.dateOfBirth), 'dd MMMM yyyy')}
                </p>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Contact Details
            </p>
            
            {client.contactNumber && (
              <div className="flex items-center gap-3 ml-6">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                <a href={`tel:${client.contactNumber}`} className="text-primary-600 hover:underline">
                  {client.contactNumber}
                </a>
              </div>
            )}
            
            {client.email && (
              <div className="flex items-center gap-3 ml-6">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${client.email}`} className="text-primary-600 hover:underline text-sm truncate">
                  {client.email}
                </a>
              </div>
            )}
          </div>

          {/* Primary Address */}
          {primaryAddress && (
            <div className="flex items-start gap-3">
              <HomeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                <p className="text-gray-900">{primaryAddress}</p>
              </div>
            </div>
          )}

          {/* Invoice Email (if different) */}
          {client.invoiceEmail && (
            <div className="flex items-start gap-3 border-l-4 border-blue-400 pl-3 bg-blue-50 py-2 rounded-r-lg">
              <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide">Invoice Email</p>
                <a href={`mailto:${client.invoiceEmail}`} className="text-blue-700 hover:underline text-sm">
                  {client.invoiceEmail}
                </a>
              </div>
            </div>
          )}

          {/* Billing Address (if different) */}
          {billingAddress && (
            <div className="flex items-start gap-3 border-l-4 border-blue-400 pl-3 bg-blue-50 py-2 rounded-r-lg">
              <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide">Billing Address</p>
                <p className="text-blue-800">{billingAddress}</p>
              </div>
            </div>
          )}

          {/* Correspondence Address (if different) */}
          {correspondenceAddress && (
            <div className="flex items-start gap-3 border-l-4 border-purple-400 pl-3 bg-purple-50 py-2 rounded-r-lg">
              <ShieldCheckIcon className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="text-xs text-purple-600 uppercase tracking-wide">Correspondence Address</p>
                <p className="text-purple-800">{correspondenceAddress}</p>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {client.emergencyContact?.name && (
            <div className="border border-red-200 rounded-lg p-3 bg-red-50">
              <div className="flex items-center gap-2 text-red-800 font-medium text-sm mb-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Emergency Contact
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-900 font-medium">{client.emergencyContact.name}</p>
                {client.emergencyContact.relationship && (
                  <p className="text-gray-600">{client.emergencyContact.relationship}</p>
                )}
                {client.emergencyContact.phoneNumber && (
                  <a 
                    href={`tel:${client.emergencyContact.phoneNumber}`} 
                    className="flex items-center gap-2 text-red-700 hover:underline"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {client.emergencyContact.phoneNumber}
                  </a>
                )}
                {client.emergencyContact.email && (
                  <a 
                    href={`mailto:${client.emergencyContact.email}`} 
                    className="flex items-center gap-2 text-red-700 hover:underline"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    {client.emergencyContact.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Attending Days */}
          {client.attendingDays && client.attendingDays.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Attending Days</p>
              <div className="flex flex-wrap gap-1">
                {client.attendingDays.map((day) => (
                  <Badge key={day} className="bg-primary-100 text-primary-700">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Client Notes */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              Notes & Plans
            </p>
            {notesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : notes && notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-lg border p-3 ${NOTE_TYPE_COLORS[note.noteType]}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{NOTE_TYPE_ICONS[note.noteType]}</span>
                      <span className="font-medium text-sm">
                        {note.title || CLIENT_NOTE_TYPE_LABELS[note.noteType]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(note.createdAt), 'dd MMM yyyy')} • {note.createdByName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes added yet</p>
            )}
          </div>

          {/* Rate */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-gray-500">Session Rate</span>
            <span className="text-xl font-bold text-gray-900">£{client.rate}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

