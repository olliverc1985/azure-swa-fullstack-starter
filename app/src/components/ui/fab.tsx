import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  PlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'
import {
  ClipboardDocumentCheckIcon,
  UserPlusIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

// Emergency contacts - customise these for your organisation
// TODO: Move to settings/API for runtime configuration
const EMERGENCY_CONTACTS = [
  {
    name: 'Your Organisation Support',
    phone: '0800 000 0000',
    description: 'Internal support line',
    hours: 'Mon-Fri 9am-5pm',
  },
  {
    name: 'Out of Hours',
    phone: '0800 000 0001',
    description: 'After hours support',
    hours: 'Evenings & weekends',
  },
  {
    name: 'Police (Non-Emergency)',
    phone: '101',
    description: 'Non-urgent police matters',
    hours: '24/7',
  },
  {
    name: 'Emergency Services',
    phone: '999',
    description: 'Life-threatening emergencies only',
    hours: '24/7',
    emergency: true,
  },
]

interface FABAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
}

interface FABProps {
  actions?: FABAction[]
  onAddClient?: () => void
  onTakeRegister?: () => void
  onCreateInvoice?: () => void
}

export function FAB({ actions, onAddClient, onTakeRegister, onCreateInvoice }: FABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setShowEmergencyContacts(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const defaultActions: FABAction[] = [
    ...(onTakeRegister ? [{
      id: 'register',
      label: 'Take Register',
      icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
      onClick: () => {
        onTakeRegister()
        setIsOpen(false)
      },
      color: 'bg-green-500 hover:bg-green-600',
    }] : []),
    ...(onAddClient ? [{
      id: 'add-client',
      label: 'Add Client',
      icon: <UserPlusIcon className="h-5 w-5" />,
      onClick: () => {
        onAddClient()
        setIsOpen(false)
      },
      color: 'bg-blue-500 hover:bg-blue-600',
    }] : []),
    ...(onCreateInvoice ? [{
      id: 'create-invoice',
      label: 'New Invoice',
      icon: <DocumentPlusIcon className="h-5 w-5" />,
      onClick: () => {
        onCreateInvoice()
        setIsOpen(false)
      },
      color: 'bg-purple-500 hover:bg-purple-600',
    }] : []),
    {
      id: 'emergency',
      label: 'Emergency Contacts',
      icon: <ShieldCheckIcon className="h-5 w-5" />,
      onClick: () => {
        setShowEmergencyContacts(true)
        setIsOpen(false)
      },
      color: 'bg-red-500 hover:bg-red-600',
    },
  ]

  const allActions = actions || defaultActions

  return createPortal(
    <>
      {/* FAB Container - Fixed position in bottom right, rendered via portal */}
      <div 
        ref={menuRef}
        className="flex flex-col-reverse items-end gap-3"
        style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          zIndex: 9999,
        }}
      >
        {/* Action buttons - shown when menu is open */}
        <div className={cn(
          "flex flex-col-reverse gap-2 transition-all duration-200",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {allActions.map((action, index) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg transition-all duration-200",
                "hover:scale-105 active:scale-95",
                action.color || 'bg-gray-600 hover:bg-gray-700'
              )}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
              }}
            >
              {action.icon}
              <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
            "hover:scale-105 active:scale-95",
            isOpen 
              ? "bg-gray-700 hover:bg-gray-800 rotate-45" 
              : "bg-primary-500 hover:bg-primary-600"
          )}
          aria-label={isOpen ? "Close menu" : "Open quick actions"}
        >
          {isOpen ? (
            <XMarkIcon className="h-7 w-7 text-white transition-transform" />
          ) : (
            <PlusIcon className="h-7 w-7 text-white transition-transform" />
          )}
        </button>
      </div>

      {/* Emergency Contacts Panel Modal */}
      {showEmergencyContacts && (
        <EmergencyContactsPanel onClose={() => setShowEmergencyContacts(false)} />
      )}
    </>,
    document.body
  )
}

interface EmergencyContactsPanelProps {
  onClose: () => void
}

function EmergencyContactsPanel({ onClose }: EmergencyContactsPanelProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="emergency-contacts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-red-50 rounded-t-2xl sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <ShieldCheckIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 id="emergency-contacts-title" className="font-semibold text-gray-900">
                Emergency Contacts
              </h2>
              <p className="text-xs text-gray-500">Important phone numbers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-red-100 transition-colors -mr-1"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Contacts List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {EMERGENCY_CONTACTS.map((contact, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                contact.emergency 
                  ? "border-red-200 bg-red-50" 
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className={cn(
                    "font-medium text-sm",
                    contact.emergency ? "text-red-800" : "text-gray-900"
                  )}>
                    {contact.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{contact.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{contact.hours}</p>
                </div>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, '')}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    contact.emergency
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  )}
                >
                  <PhoneIcon className="h-4 w-4" />
                  {contact.phone}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            If someone is in immediate danger, always call <strong>999</strong> first.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Standalone Emergency Contacts FAB for pages that just need quick access
export function EmergencyContactsFAB() {
  const [showPanel, setShowPanel] = useState(false)

  return createPortal(
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          zIndex: 9999,
        }}
        aria-label="Emergency contacts"
        title="Emergency Contacts"
      >
        <ShieldCheckIcon className="h-7 w-7 text-white" />
      </button>

      {showPanel && (
        <EmergencyContactsPanel onClose={() => setShowPanel(false)} />
      )}
    </>,
    document.body
  )
}

