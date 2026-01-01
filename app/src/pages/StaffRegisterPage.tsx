import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { getStaff, getStaffRegisterByDate, createStaffRegisterEntry, deleteStaffRegisterEntry } from '@/services/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Checkbox,
  Badge,
  Skeleton,
  Input,
  Textarea,
  useToast,
} from '@/components/ui'
import { formatCurrency, formatDateLong } from '@/lib/utils'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import type { StaffMember, DayOfWeek, StaffRegisterEntry } from '@/types'

const dayColors: Record<DayOfWeek, string> = {
  monday: 'bg-gray-100 text-gray-700',
  tuesday: 'bg-blue-100 text-blue-700',
  wednesday: 'bg-green-100 text-green-700',
  thursday: 'bg-purple-100 text-purple-700',
  friday: 'bg-amber-100 text-amber-700',
  saturday: 'bg-slate-100 text-slate-700',
  sunday: 'bg-red-100 text-red-700',
}

export function StaffRegisterPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllStaff, setShowAllStaff] = useState(true)
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  
  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayOfWeek = format(selectedDate, 'EEEE').toLowerCase() as DayOfWeek

  // Get all staff members
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: getStaff,
  })

  // Get existing entries for the selected date
  const { data: existingEntries = [], isLoading: registerLoading } = useQuery({
    queryKey: ['staff-register', dateString],
    queryFn: () => getStaffRegisterByDate(dateString),
  })

  // Map for quick lookup of saved entries by staffId
  const existingEntriesByStaffId = useMemo(() => {
    const map: Record<string, StaffRegisterEntry> = {}
    existingEntries.forEach((entry) => {
      map[entry.staffId] = entry
    })
    return map
  }, [existingEntries])

  // Load existing attendance when date changes - use stable dependency
  const existingEntryIds = existingEntries.map(e => e.staffId).join(',')
  useEffect(() => {
    const existingAttendance: Record<string, boolean> = {}
    existingEntries.forEach((entry) => {
      existingAttendance[entry.staffId] = true
    })
    setAttendance(existingAttendance)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEntryIds])

  // Filter staff by day and search
  // Staff with no working days set are "cover" staff - available any day
  const filteredStaff = useMemo(() => {
    let filtered = staff.filter((s) => s.isActive)
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((member) =>
        member.concatName.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      )
    } else if (!showAllStaff) {
      filtered = filtered.filter((member) => {
        // Show if: scheduled for this day OR no working days set (cover staff)
        const hasNoSchedule = !member.workingDays || member.workingDays.length === 0
        return hasNoSchedule || member.workingDays?.includes(selectedDayOfWeek)
      })
    }
    
    return filtered.sort((a, b) => a.concatName.localeCompare(b.concatName))
  }, [staff, selectedDayOfWeek, showAllStaff, searchQuery])

  // Count staff for this day (scheduled + cover staff with no set days)
  const staffForDay = staff.filter((s) => {
    if (!s.isActive) return false
    const hasNoSchedule = !s.workingDays || s.workingDays.length === 0
    return hasNoSchedule || s.workingDays?.includes(selectedDayOfWeek)
  }).length

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(attendance)
        .filter(([_, present]) => present)
        .filter(([staffId]) => !existingEntries.some((e) => e.staffId === staffId))
        .map(([staffId]) => {
          return {
            staffId,
            date: dateString,
            notes: notes || undefined,
          }
        })
      
      for (const entry of entries) {
        await createStaffRegisterEntry(entry)
      }
      
      return entries.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['staff-register'] })
      toast.success(`Saved ${count} attendance record${count !== 1 ? 's' : ''}!`, 'Register Saved')
    },
    onError: (error: Error) => {
      toast.error(error.message, 'Failed to Save')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteStaffRegisterEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-register'] })
      toast.success('Check-in removed', 'Entry deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message, 'Failed to remove check-in')
    },
  })


  const handleAttendanceChange = (staffId: string, present: boolean) => {
    if (deleteMutation.isPending) {
      return
    }

    const existingEntry = existingEntriesByStaffId[staffId]
    if (!present && existingEntry) {
      const confirmed = window.confirm('Are you sure you want to remove this check-in?')
      if (!confirmed) {
        return
      }
      deleteMutation.mutate(existingEntry.id)
      setAttendance((prev) => {
        const next = { ...prev }
        delete next[staffId]
        return next
      })
      return
    }

    setAttendance((prev) => ({
      ...prev,
      [staffId]: present,
    }))
  }

  const handleMarkAllPresent = () => {
    const newAttendance: Record<string, boolean> = {}
    filteredStaff.forEach((member) => {
      newAttendance[member.id] = true
    })
    setAttendance(newAttendance)
  }

  const presentCount = Object.values(attendance).filter(Boolean).length
  const newEntriesCount = Object.entries(attendance)
    .filter(([staffId, present]) => present && !existingEntries.some((e) => e.staffId === staffId))
    .length
  const totalDayRate = staff
    .filter((s) => attendance[s.id])
    .reduce((sum, s) => sum + s.dayRate, 0)

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1))
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1))
  const goToToday = () => setSelectedDate(new Date())

  // Generate week dates for quick navigation
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const isLoading = staffLoading || registerLoading

  // Full register view - available to all staff members
  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-900">Staff Register</h1>
          <p className="text-sm sm:text-base text-gray-500">Record staff attendance</p>
        </div>
        <Button onClick={goToToday} variant="outline" size="sm" className="sm:h-10 sm:px-4">
          <CalendarIcon className="mr-1.5 sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Today</span>
          <span className="sm:hidden">Now</span>
        </Button>
      </div>

      {/* Date navigation */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            
            <div className="text-center min-w-0 flex-1">
              <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {formatDateLong(selectedDate)}
              </p>
              <Badge className={`mt-1 text-[10px] sm:text-xs ${dayColors[selectedDayOfWeek]}`}>
                {staffForDay} expected
              </Badge>
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextDay} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Week quick nav */}
          <div className="mt-3 sm:mt-4 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex justify-start sm:justify-center gap-1 min-w-max sm:min-w-0">
              {weekDates.map((date) => {
                const dayOfWeek = format(date, 'EEEE').toLowerCase() as DayOfWeek
                const staffCount = staff.filter((s) => 
                  s.isActive && s.workingDays?.includes(dayOfWeek)
                ).length
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm transition-colors flex-shrink-0 min-w-[48px] sm:min-w-0 ${
                      isSameDay(date, selectedDate)
                        ? 'bg-violet-500 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs font-medium">
                      {format(date, 'EEE')}
                    </span>
                    <span className="text-base sm:text-lg font-semibold">
                      {format(date, 'd')}
                    </span>
                    {staffCount > 0 && !isSameDay(date, selectedDate) && (
                      <span className="text-[10px] text-gray-400">{staffCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance list */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* Search and filters */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 sm:pl-10 h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showAllStaff ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowAllStaff(!showAllStaff)}
                    className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                  >
                    <UserGroupIcon className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">{showAllStaff ? 'Showing All' : 'Show All'}</span>
                    <span className="sm:hidden">All</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllPresent}
                    disabled={filteredStaff.length === 0}
                    className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                  >
                    <CheckCircleIcon className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Mark All Present</span>
                    <span className="sm:hidden">All Present</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>
                  {showAllStaff ? 'All Staff' : `${format(selectedDate, 'EEEE')} Staff`}
                </span>
                <Badge variant="outline">{filteredStaff.length} staff</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="divide-y divide-gray-100">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery 
                    ? `No staff found matching "${searchQuery}".`
                    : showAllStaff 
                      ? 'No active staff members.'
                      : `No staff scheduled for ${format(selectedDate, 'EEEE')}s.`
                  }
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredStaff.map((member) => {
                    const isAlreadySaved = existingEntries.some((e) => e.staffId === member.id)
                    const existingEntry = existingEntries.find((e) => e.staffId === member.id)
                    
                    return (
                      <StaffRow
                        key={member.id}
                        staff={member}
                        present={attendance[member.id] || false}
                        isAlreadySaved={isAlreadySaved}
                        savedAt={existingEntry?.createdAt}
                        selectedDay={selectedDayOfWeek}
                        onAttendanceChange={handleAttendanceChange}
                        showDayRate={isAdmin}
                      />
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4 sm:space-y-6 order-first lg:order-none">
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-xl">Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: Compact horizontal layout */}
              <div className="sm:hidden">
                <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-center mb-3`}>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-600">{staffForDay}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Expected</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-700">{presentCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Present</p>
                  </div>
                  {isAdmin && (
                    <div className="bg-violet-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-violet-600">{formatCurrency(totalDayRate)}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Total</p>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  size="default" 
                  disabled={newEntriesCount === 0 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Saving...' : `Save Register (${newEntriesCount} new)`}
                </Button>
              </div>
              
              {/* Desktop: Vertical layout */}
              <div className="hidden sm:block space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Expected</span>
                  <span className="text-xl font-semibold text-gray-600">{staffForDay}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Present</span>
                  <span className="text-2xl font-bold text-gray-900">{presentCount}</span>
                </div>
                {isAdmin && (
                  <>
                    <hr />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Total Day Rates</span>
                      <span className="text-2xl font-bold text-violet-600">
                        {formatCurrency(totalDayRate)}
                      </span>
                    </div>
                  </>
                )}
                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={newEntriesCount === 0 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Saving...' : `Save Register (${newEntriesCount} new)`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="hidden sm:block">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                placeholder="Add notes for this session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface StaffRowProps {
  staff: StaffMember
  present: boolean
  isAlreadySaved: boolean
  savedAt?: string
  selectedDay: DayOfWeek
  onAttendanceChange: (staffId: string, present: boolean) => void
  showDayRate?: boolean
}

function StaffRow({ staff, present, isAlreadySaved, savedAt, selectedDay, onAttendanceChange, showDayRate = false }: StaffRowProps) {
  return (
    <div
      className={`p-3 sm:p-4 transition-colors cursor-pointer ${
        present || isAlreadySaved
          ? 'bg-green-50' 
          : 'hover:bg-gray-50'
      }`}
      onClick={() => onAttendanceChange(staff.id, !present)}
    >
      <div className="flex items-center gap-2.5 sm:gap-4">
        <Checkbox
          checked={present || isAlreadySaved}
          onCheckedChange={(checked) => onAttendanceChange(staff.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5"
        />
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white font-semibold text-xs sm:text-sm">
          {staff.firstName[0]}{staff.lastName[0]}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-medium text-gray-900 text-sm sm:text-base flex items-center gap-1.5 min-w-0">
            <span className="truncate min-w-0 flex-1" title={staff.concatName}>{staff.concatName}</span>
            {(!staff.workingDays || staff.workingDays.length === 0) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium flex-shrink-0">
                Cover
              </span>
            )}
          </p>
          <div className="hidden sm:flex flex-wrap gap-1 mt-0.5">
            {staff.workingDays && staff.workingDays.length > 0 ? (
              staff.workingDays.map((day) => (
                <span
                  key={day}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    day === selectedDay
                      ? 'bg-violet-500 text-white'
                      : dayColors[day]
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-gray-400 italic">Available any day</span>
            )}
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          {showDayRate && (
            <p className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(staff.dayRate)}</p>
          )}
          {isAlreadySaved && savedAt && (
            <p className="text-[10px] text-green-600">
              Saved {format(new Date(savedAt), 'HH:mm')}
            </p>
          )}
        </div>
      </div>
      
      {(present || isAlreadySaved) && (
        <div className="mt-2 flex justify-end">
          <Badge variant="success" className="text-xs">
            {isAlreadySaved ? '✓ Saved' : '✓ Present'}
          </Badge>
        </div>
      )}
    </div>
  )
}

