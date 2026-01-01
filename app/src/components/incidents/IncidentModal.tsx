import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createIncident, updateIncident } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Select,
  Checkbox,
} from '@/components/ui'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { IncidentReport, IncidentSeverity, Client } from '@/types'

interface IncidentModalProps {
  incident?: IncidentReport | null
  client: Client
  reporterName: string
  onClose: () => void
  onSuccess: () => void
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', colour: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', colour: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', colour: 'bg-red-100 text-red-700' },
] as const

export function IncidentModal({ incident, client, reporterName, onClose, onSuccess }: IncidentModalProps) {
  const isEditing = !!incident
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    date: incident?.date || new Date().toISOString().split('T')[0],
    time: incident?.time || new Date().toTimeString().slice(0, 5),
    description: incident?.description || '',
    actionTaken: incident?.actionTaken || '',
    witnesses: incident?.witnesses?.join(', ') || '',
    severity: (incident?.severity || 'low') as IncidentSeverity,
    followUpRequired: incident?.followUpRequired || false,
    followUpNotes: incident?.followUpNotes || '',
    status: incident?.status || 'open',
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      onSuccess()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IncidentReport> }) => updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      onSuccess()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    const witnessesArray = formData.witnesses
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0)

    if (isEditing && incident) {
      updateMutation.mutate({
        id: incident.id,
        data: {
          ...formData,
          witnesses: witnessesArray,
        },
      })
    } else {
      createMutation.mutate({
        clientId: client.id,
        clientName: client.concatName,
        reportedByName: reporterName,
        ...formData,
        witnesses: witnessesArray,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 sm:border-0">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              {isEditing ? 'Edit Incident Report' : 'New Incident Report'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              For: <span className="font-medium text-gray-700">{client.concatName}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 -mr-2">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date and Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Date *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
              <Input
                label="Time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, severity: option.value })}
                    className={`px-4 py-3 sm:px-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors border touch-target ${
                      formData.severity === option.value
                        ? option.colour + ' border-current'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description of Incident *
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={4}
                placeholder="Describe what happened in detail..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Action Taken */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Action Taken
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={3}
                placeholder="What action was taken in response to the incident..."
                value={formData.actionTaken}
                onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
              />
            </div>

            {/* Witnesses */}
            <Input
              label="Witnesses"
              value={formData.witnesses}
              onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
              placeholder="Separate names with commas"
            />

            {/* Follow-up Required */}
            <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="followUpRequired"
                  checked={formData.followUpRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, followUpRequired: !!checked })}
                />
                <label htmlFor="followUpRequired" className="text-sm font-medium text-amber-800">
                  Follow-up Required
                </label>
              </div>
              {formData.followUpRequired && (
                <textarea
                  className="w-full rounded-lg border border-amber-300 bg-white p-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 mt-2"
                  rows={2}
                  placeholder="Describe the follow-up actions needed..."
                  value={formData.followUpNotes}
                  onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                />
              )}
            </div>

            {/* Status (only for editing) */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'open' })}
                    className={`px-4 py-3 sm:px-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors border touch-target ${
                      formData.status === 'open'
                        ? 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    🔓 Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'resolved' })}
                    className={`px-4 py-3 sm:px-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors border touch-target ${
                      formData.status === 'resolved'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    ✅ Resolved
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 pb-2 sm:pb-0">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 sm:h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 h-11 sm:h-10 bg-red-600 hover:bg-red-700">
                {isLoading ? 'Saving...' : isEditing ? 'Update Report' : 'Create Report'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}




















