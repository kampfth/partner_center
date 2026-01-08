import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
  minDate?: string
  maxDate?: string
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: -1 }, // Special case
  { label: 'All time', days: 0 }, // Special case
]

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePresetClick = (days: number) => {
    const end = maxDate || new Date().toISOString().split('T')[0]

    let start: string
    if (days === 0 && minDate) {
      // All time
      start = minDate
    } else if (days === -1) {
      // This year
      start = `${new Date().getFullYear()}-01-01`
    } else {
      const date = new Date()
      date.setDate(date.getDate() - days)
      start = date.toISOString().split('T')[0]
      if (minDate && start < minDate) {
        start = minDate
      }
    }

    onChange(start, end)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="justify-between min-w-[180px]"
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-xs">
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 z-50 w-48 rounded-lg border bg-card shadow-lg p-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.days)}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
