import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getClientNotes, createClientNote, updateClientNote, deleteClientNote } from '@/services/api'
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
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import type { ClientNote, ClientNoteType, Client } from '@/types'
import { CLIENT_NOTE_TYPE_LABELS } from '@/types'
import { useAuth } from '@/hooks/useAuth'

interface ClientNotesProps {
  client: Client
  compact?: boolean
}

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
  general: 'bg-blue-100 text-blue-700 border-blue-200',
  requirements: 'bg-orange-100 text-orange-700 border-orange-200',
  preferences: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  billing: 'bg-purple-100 text-purple-700 border-purple-200',
  feedback: 'bg-slate-100 text-slate-700 border-slate-200',
  follow_up: 'bg-green-100 text-green-700 border-green-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function ClientNotes({ client, compact = false }: ClientNotesProps) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null)
  const [selectedNoteType, setSelectedNoteType] = useState<ClientNoteType | null>(null)

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['client-notes', client.id],
    queryFn: () => getClientNotes(client.id),
  })

  // Group notes by type
  const notesByType = notes.reduce((acc, note) => {
    if (!acc[note.noteType]) {
      acc[note.noteType] = []
    }
    acc[note.noteType].push(note)
    return acc
  }, {} as Record<ClientNoteType, ClientNote[]>)

  const handleAddNote = (noteType?: ClientNoteType) => {
    setEditingNote(null)
    setSelectedNoteType(noteType || null)
    setShowModal(true)
  }

  const handleEditNote = (note: ClientNote) => {
    setEditingNote(note)
    setSelectedNoteType(note.noteType)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingNote(null)
    setSelectedNoteType(null)
  }

  if (compact) {
    // Compact view for embedding in client form
    return (
      <div className="border border-indigo-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-indigo-50">
          <span className="flex items-center gap-2 text-sm font-medium text-indigo-800">
            <DocumentTextIcon className="h-4 w-4" />
            Notes & Plans
            {notes.length > 0 && (
              <Badge variant="outline" className="ml-1 bg-indigo-100 text-indigo-700 border-indigo-300">
                {notes.length}
              </Badge>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={() => handleAddNote()} className="h-7 px-2 text-indigo-700 hover:bg-indigo-100">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Note type buttons */}
        <div className="p-3 bg-white">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(Object.keys(CLIENT_NOTE_TYPE_LABELS) as ClientNoteType[]).map((type) => {
              const hasNote = notesByType[type]?.length > 0
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => hasNote ? handleEditNote(notesByType[type][0]) : handleAddNote(type)}
                  className={`flex flex-col items-center p-3 sm:p-2 rounded-lg text-xs transition-all border touch-target ${
                    hasNote
                      ? NOTE_TYPE_COLORS[type] + ' border-current'
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                  }`}
                  title={CLIENT_NOTE_TYPE_LABELS[type]}
                >
                  <span className="text-lg mb-0.5">{NOTE_TYPE_ICONS[type]}</span>
                  <span className="truncate w-full text-center text-[10px]">
                    {CLIENT_NOTE_TYPE_LABELS[type].split(' ')[0]}
                  </span>
                  {hasNote && (
                    <CheckIcon className="h-3 w-3 mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {showModal && (
          <NoteModal
            note={editingNote}
            client={client}
            noteType={selectedNoteType}
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
          <DocumentTextIcon className="h-5 w-5 text-indigo-500" />
          Notes & Plans
        </CardTitle>
        <Button onClick={() => handleAddNote()} size="sm">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No notes or plans for this client yet.</p>
            <Button onClick={() => handleAddNote()} variant="outline" className="mt-3">
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Add First Note
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => handleEditNote(note)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {showModal && (
        <NoteModal
          note={editingNote}
          client={client}
          noteType={selectedNoteType}
          reporterName={user ? `${user.firstName} ${user.lastName}` : 'Unknown'}
          onClose={handleCloseModal}
          onSuccess={handleCloseModal}
        />
      )}
    </Card>
  )
}

interface NoteCardProps {
  note: ClientNote
  onEdit: () => void
}

function NoteCard({ note, onEdit }: NoteCardProps) {
  const queryClient = useQueryClient()
  
  const deleteMutation = useMutation({
    mutationFn: deleteClientNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notes'] })
    },
  })

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate(note.id)
    }
  }

  return (
    <div className={`border rounded-lg p-3 ${NOTE_TYPE_COLORS[note.noteType]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{NOTE_TYPE_ICONS[note.noteType]}</span>
          <div>
            <p className="font-medium">{note.title}</p>
            <p className="text-xs opacity-75">
              Updated {format(new Date(note.updatedAt), 'dd MMM yyyy')} by {note.createdByName}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100">
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap">{note.content}</p>
    </div>
  )
}

interface NoteModalProps {
  note?: ClientNote | null
  client: Client
  noteType?: ClientNoteType | null
  reporterName: string
  onClose: () => void
  onSuccess: () => void
}

function NoteModal({ note, client, noteType, reporterName, onClose, onSuccess }: NoteModalProps) {
  const isEditing = !!note
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    noteType: (note?.noteType || noteType || 'other') as ClientNoteType,
    title: note?.title || '',
    content: note?.content || '',
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: createClientNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notes'] })
      onSuccess()
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientNote> }) => updateClientNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notes'] })
      onSuccess()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.content.trim()) {
      setError('Content is required')
      return
    }

    const title = formData.title.trim() || CLIENT_NOTE_TYPE_LABELS[formData.noteType]

    if (isEditing && note) {
      updateMutation.mutate({
        id: note.id,
        data: {
          noteType: formData.noteType,
          title,
          content: formData.content,
        },
      })
    } else {
      createMutation.mutate({
        clientId: client.id,
        noteType: formData.noteType,
        title,
        content: formData.content,
        createdByName: reporterName,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 sm:border-0">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <span>{NOTE_TYPE_ICONS[formData.noteType]}</span>
              {isEditing ? 'Edit Note' : 'Add Note'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              For: <span className="font-medium text-gray-700">{client.concatName}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 -mr-2">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Note Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note Type *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CLIENT_NOTE_TYPE_LABELS) as ClientNoteType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, noteType: type })}
                    className={`flex flex-col items-center p-3 sm:p-2 rounded-lg text-xs transition-all border touch-target ${
                      formData.noteType === type
                        ? NOTE_TYPE_COLORS[type] + ' border-current ring-2 ring-offset-1'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{NOTE_TYPE_ICONS[type]}</span>
                    <span className="truncate w-full text-center">
                      {CLIENT_NOTE_TYPE_LABELS[type].split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Title (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title (optional)
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder={CLIENT_NOTE_TYPE_LABELS[formData.noteType]}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Content *
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={6}
                placeholder="Enter the note content..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 pb-2 sm:pb-0">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11 sm:h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 h-11 sm:h-10">
                {isLoading ? 'Saving...' : isEditing ? 'Update Note' : 'Add Note'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}

