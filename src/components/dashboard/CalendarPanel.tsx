'use client'

import CalendarPageV2 from '@/components/calendar/CalendarPageV2_Complete'

export default function CalendarPanel() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <CalendarPageV2 isDashboard={true} />
    </div>
  )
}
