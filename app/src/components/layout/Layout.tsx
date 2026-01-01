import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileSidebar } from './MobileSidebar'
import { useAuth } from '@/hooks/useAuth'
import { getRegisterByDate } from '@/services/api'
import {
  PlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  PhoneIcon,
  ClipboardDocumentCheckIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui'

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const [showWhosIn, setShowWhosIn] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const currentPath = location.pathname
  const isRegisterPage = currentPath === '/register'

  return (
    <div className="relative flex h-screen bg-page overflow-hidden">
      {/* Ambient spotlight effects */}
      <div className="spotlight spotlight-blue w-[600px] h-[600px] -top-48 -right-24 opacity-50 animate-pulse-soft" />
      <div className="spotlight spotlight-blue w-[500px] h-[500px] bottom-0 left-1/4 opacity-30 animate-pulse-soft" style={{ animationDelay: '1s' }} />
      <div className="spotlight spotlight-purple w-[350px] h-[350px] top-1/3 right-1/3 opacity-20 animate-pulse-soft" style={{ animationDelay: '2s' }} />
      <div className="spotlight spotlight-blue w-[450px] h-[450px] top-1/2 -left-20 opacity-40 animate-pulse-soft" style={{ animationDelay: '0.5s' }} />
      
      {/* Skip link for keyboard navigation - hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
      >
        Skip to main content
      </a>
      
      <Sidebar />
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main
          id="main-content"
          className="flex-1 overflow-auto overflow-x-hidden p-4 sm:p-6 overscroll-contain"
          role="main"
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>

      {/* FAB - Fixed positioning at bottom right of viewport */}
      {/* Container has pointer-events-none so it doesn't block scrolling, buttons have pointer-events-auto */}
      <div 
        className="flex flex-col items-end gap-3 pointer-events-none"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
        }}
      >
        {/* Action buttons - shown when menu is open (not on register page) - appear ABOVE the FAB */}
        {!isRegisterPage && (
          <div className={cn(
            "flex flex-col gap-2 transition-all duration-200",
            fabOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            <button
              onClick={() => { setShowEmergencyContacts(true); setFabOpen(false); }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg bg-red-500 hover:bg-red-600 transition-all hover:scale-105 active:scale-95"
            >
              <ShieldCheckIcon className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">Emergency</span>
            </button>
            <button
              onClick={() => { setShowWhosIn(true); setFabOpen(false); }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg bg-amber-500 hover:bg-amber-600 transition-all hover:scale-105 active:scale-95"
            >
              <UserGroupIcon className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">Who's In</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => { navigate('/invoices?action=create'); setFabOpen(false); }}
                className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg bg-purple-500 hover:bg-purple-600 transition-all hover:scale-105 active:scale-95"
              >
                <DocumentPlusIcon className="h-5 w-5" />
                <span className="text-sm font-medium whitespace-nowrap">New Invoice</span>
              </button>
            )}
            <button
              onClick={() => { navigate('/clients?action=add'); setFabOpen(false); }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg bg-blue-500 hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">Add Client</span>
            </button>
            <button
              onClick={() => { navigate('/register'); setFabOpen(false); }}
              className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg bg-green-500 hover:bg-green-600 transition-all hover:scale-105 active:scale-95"
            >
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">Take Register</span>
            </button>
          </div>
        )}

        {/* Main FAB button - at the bottom */}
        <button
          onClick={() => isRegisterPage ? setShowEmergencyContacts(true) : setFabOpen(!fabOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 pointer-events-auto",
            "hover:scale-105 active:scale-95",
            isRegisterPage 
              ? "bg-red-500 hover:bg-red-600"
              : fabOpen 
                ? "bg-gray-700 hover:bg-gray-800" 
                : "bg-primary-500 hover:bg-primary-600"
          )}
          aria-label={isRegisterPage ? "Emergency contacts" : fabOpen ? "Close menu" : "Open quick actions"}
        >
          {isRegisterPage ? (
            <ShieldCheckIcon className="h-7 w-7 text-white" />
          ) : fabOpen ? (
            <XMarkIcon className="h-7 w-7 text-white" />
          ) : (
            <PlusIcon className="h-7 w-7 text-white" />
          )}
        </button>
      </div>

      {/* Emergency Contacts Modal */}
      {showEmergencyContacts && (
        <EmergencyContactsModal onClose={() => setShowEmergencyContacts(false)} />
      )}

      {/* Who's In Modal - Fire Safety Register */}
      {showWhosIn && (
        <WhosInModal onClose={() => setShowWhosIn(false)} />
      )}
    </div>
  )
}

// Emergency contacts data - customise for your organisation
// TODO: Move to settings/API for runtime configuration
const EMERGENCY_CONTACTS = [
  { name: 'Your Organisation Support', phone: '0800 000 0000', description: 'Internal support line', hours: 'Mon-Fri 9am-5pm' },
  { name: 'Out of Hours', phone: '0800 000 0001', description: 'After hours support', hours: 'Evenings & weekends' },
  { name: 'Police (Non-Emergency)', phone: '101', description: 'Non-urgent police matters', hours: '24/7' },
  { name: 'Emergency Services', phone: '999', description: 'Life-threatening emergencies only', hours: '24/7', emergency: true },
]

function EmergencyContactsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-red-50 rounded-t-2xl sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <ShieldCheckIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Emergency Contacts</h2>
              <p className="text-xs text-gray-500">Important phone numbers</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-red-100 transition-colors -mr-1">
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
                contact.emergency ? "border-red-200 bg-red-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className={cn("font-medium text-sm", contact.emergency ? "text-red-800" : "text-gray-900")}>
                    {contact.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{contact.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{contact.hours}</p>
                </div>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, '')}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    contact.emergency ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary-500 text-white hover:bg-primary-600"
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
    </div>
  )
}

// Who's In Modal - Shows physically present people for fire safety
function WhosInModal({ onClose }: { onClose: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayFormatted = format(new Date(), 'EEEE, d MMMM yyyy')
  
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['register', today, 'whos-in'],
    queryFn: () => getRegisterByDate(today),
  })
  
  // Filter to only show physically present people (not late cancellations)
  const presentEntries = entries.filter(entry => 
    entry.attendanceStatus === 'present' || 
    // Legacy: if no attendanceStatus, use attended boolean
    (!entry.attendanceStatus && entry.attended === true)
  )
  
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-amber-50 rounded-t-2xl sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <UserGroupIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Who's In the Building</h2>
              <p className="text-xs text-gray-500">{todayFormatted}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-amber-100 transition-colors -mr-1">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* List of Present People */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          ) : presentEntries.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No one checked in yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Use the register to mark attendance
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Count header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">People in building</span>
                <span className="text-2xl font-bold text-amber-600">{presentEntries.length}</span>
              </div>
              
              {/* List */}
              {presentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white font-semibold text-sm">
                    {entry.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{entry.clientName}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✓ Present
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            🔥 <strong>Fire Safety:</strong> This list shows people physically in the building
          </p>
        </div>
      </div>
    </div>
  )
}
