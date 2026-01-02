import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getIncidents, deleteIncident } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '@/components/ui'
import {
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { IncidentModal } from './IncidentModal'
import type { IncidentReport, Client } from '@/types'
import { useAuth } from '@/hooks/useAuth'

interface IncidentsListProps {
  client: Client
  compact?: boolean // For inline display in client card
}

const SEVERITY_STYLES = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200',
} as const

export function IncidentsList({ client, compact = false }: IncidentsListProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: incidents = [], isLoading, error } = useQuery({
    queryKey: ['incidents', client.id],
    queryFn: () => getIncidents(client.id),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  const handleAddIncident = () => {
    setEditingIncident(null)
    setShowModal(true)
  }

  const handleEditIncident = (incident: IncidentReport) => {
    setEditingIncident(incident)
    setShowModal(true)
  }

  const handleDeleteIncident = (id: string) => {
    if (confirm('Are you sure you want to delete this incident report?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingIncident(null)
  }

  const openIncidents = incidents.filter(i => i.status === 'open')
  // resolvedIncidents available for future use
  const _resolvedIncidents = incidents.filter(i => i.status === 'resolved')
  void _resolvedIncidents // Suppress unused warning

  if (compact) {
    // Compact view for embedding in client card
    return (
      <div className="border border-red-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-red-50">
          <span className="flex items-center gap-2 text-sm font-medium text-red-800">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Incident Reports
            {incidents.length > 0 && (
              <Badge variant="outline" className="ml-1 bg-red-100 text-red-700 border-red-300">
                {incidents.length}
              </Badge>
            )}
            {openIncidents.length > 0 && (
              <Badge className="bg-amber-500 text-white text-xs">
                {openIncidents.length} open
              </Badge>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={handleAddIncident} className="h-7 px-2 text-red-700 hover:bg-red-100">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        {incidents.length > 0 && (
          <div className="max-h-48 overflow-y-auto divide-y divide-red-100">
            {incidents.slice(0, 3).map((incident) => (
              <div key={incident.id} className="p-2 text-sm hover:bg-red-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{format(new Date(incident.date), 'dd MMM yyyy')}</span>
                  <Badge className={`text-xs ${SEVERITY_STYLES[incident.severity]}`}>
                    {incident.severity}
                  </Badge>
                </div>
                <p className="text-gray-800 truncate mt-0.5">{incident.description}</p>
              </div>
            ))}
            {incidents.length > 3 && (
              <div className="p-2 text-center text-xs text-red-600">
                +{incidents.length - 3} more incidents
              </div>
            )}
          </div>
        )}
        {showModal && (
          <IncidentModal
            incident={editingIncident}
            client={client}
            reporterName={user ? `${user.firstName} ${user.lastName}` : 'Unknown'}
            onClose={handleCloseModal}
            onSuccess={handleCloseModal}
          />
        )}
      </div>
    )
  }

  // Full view
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          Incident Reports
          {openIncidents.length > 0 && (
            <Badge className="bg-amber-500 text-white ml-2">
              {openIncidents.length} open
            </Badge>
          )}
        </CardTitle>
        <Button onClick={handleAddIncident} size="sm">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New Report
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            Failed to load incidents. Please try again.
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No incident reports for this client.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {incidents.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                isExpanded={expandedId === incident.id}
                onToggleExpand={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
                onEdit={() => handleEditIncident(incident)}
                onDelete={() => handleDeleteIncident(incident.id)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {showModal && (
        <IncidentModal
          incident={editingIncident}
          client={client}
          reporterName={user ? `${user.firstName} ${user.lastName}` : 'Unknown'}
          onClose={handleCloseModal}
          onSuccess={handleCloseModal}
        />
      )}
    </Card>
  )
}

interface IncidentRowProps {
  incident: IncidentReport
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
}

function IncidentRow({ incident, isExpanded, onToggleExpand, onEdit, onDelete }: IncidentRowProps) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
          incident.status === 'open' ? 'bg-amber-500' : 'bg-green-500'
        }`} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              {format(new Date(incident.date), 'dd MMMM yyyy')}
            </span>
            <span className="text-gray-500 text-sm">{incident.time}</span>
            <Badge className={`text-xs ${SEVERITY_STYLES[incident.severity]}`}>
              {incident.severity}
            </Badge>
            <Badge variant={incident.status === 'open' ? 'warning' : 'success'} className="text-xs">
              {incident.status === 'open' ? '🔓 Open' : '✅ Resolved'}
            </Badge>
            {incident.followUpRequired && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                Follow-up needed
              </Badge>
            )}
          </div>

          <p className={`text-gray-700 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {incident.description}
          </p>

          {isExpanded && (
            <div className="mt-3 space-y-2 text-sm">
              {incident.actionTaken && (
                <div>
                  <span className="font-medium text-gray-700">Action Taken:</span>
                  <p className="text-gray-600 mt-0.5">{incident.actionTaken}</p>
                </div>
              )}
              {incident.witnesses && incident.witnesses.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Witnesses:</span>
                  <p className="text-gray-600 mt-0.5">{incident.witnesses.join(', ')}</p>
                </div>
              )}
              {incident.followUpNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <span className="font-medium text-amber-800">Follow-up Notes:</span>
                  <p className="text-amber-700 mt-0.5">{incident.followUpNotes}</p>
                </div>
              )}
              <div className="text-xs text-gray-500 pt-2">
                Reported by {incident.reportedByName} on {format(new Date(incident.createdAt), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-8 w-8">
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-gray-500 hover:text-blue-600">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-gray-500 hover:text-red-600">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}





















