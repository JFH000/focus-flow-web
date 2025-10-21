'use client'

import CalendarPage from '@/components/calendar/CalendarPage'

export default function CalendarPanel() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <CalendarPage isDashboard={true} />
    </div>
  )
}
