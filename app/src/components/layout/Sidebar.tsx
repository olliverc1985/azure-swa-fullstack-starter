import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { appConfig } from '@/config/app.config'
import {
  HomeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  UsersIcon,
  IdentificationIcon,
  ClockIcon,
  CalculatorIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, adminOnly: true },
  { name: 'Clients', href: '/clients', icon: UserGroupIcon, adminOnly: false },
  { name: 'Registrations', href: '/registrations', icon: ClipboardDocumentCheckIcon, adminOnly: true },
  { name: 'Register', href: '/register', icon: ClipboardDocumentListIcon, adminOnly: false },
  { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon, adminOnly: true },
  { name: 'divider', href: '', icon: null, adminOnly: true }, // Visual separator
  { name: 'Staff', href: '/staff', icon: IdentificationIcon, adminOnly: true },
  { name: 'Staff Check-in', href: '/staff-register', icon: ClockIcon, adminOnly: false },
  { name: 'Reconciliation', href: '/staff-reconciliation', icon: CalculatorIcon, adminOnly: true },
  { name: 'divider2', href: '', icon: null, adminOnly: true }, // Visual separator
  { name: 'Users', href: '/users', icon: UsersIcon, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, adminOnly: true },
]

export function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-white/60 glass-strong lg:flex lg:flex-col relative z-10">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/50 px-4 bg-gradient-to-r from-slate-50/70 to-transparent">
        <img 
          src={appConfig.logo.path}
          alt={appConfig.logo.alt}
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          // Render dividers
          if (item.name.startsWith('divider')) {
            return <div key={item.name} className="my-2 border-t border-slate-200/50" />
          }
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 shadow-sm border border-blue-200/50'
                    : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900 hover:shadow-sm'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon && (
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-400'
                      )}
                    />
                  )}
                  {item.name}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      {appConfig.owner.showInFooter && (appConfig.owner.name || appConfig.owner.company) && (
        <div className="border-t border-slate-200/50 p-4">
          <div className="rounded-xl bg-gradient-to-br from-slate-100/80 via-slate-50/60 to-blue-50/40 p-4 shadow-sm border border-white/60">
            {appConfig.owner.name && (
              <p className="text-xs font-semibold text-slate-700">{appConfig.owner.name}</p>
            )}
            {appConfig.owner.company && (
              <p className="text-xs text-slate-500">{appConfig.owner.name ? `trading as ${appConfig.owner.company}` : appConfig.owner.company}</p>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}


