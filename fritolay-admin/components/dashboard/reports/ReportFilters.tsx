'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, GitCompare } from 'lucide-react'

interface ReportFiltersProps {
  currentPeriod: 'week' | 'month' | 'year'
  comparePeriods: boolean
}

export default function ReportFilters({ currentPeriod, comparePeriods }: ReportFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/dashboard/reportes?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Selector de período */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
        <Calendar className="w-4 h-4 text-text-secondary" />
        <select
          value={currentPeriod}
          onChange={(e) => updateFilter('period', e.target.value)}
          className="bg-transparent border-none outline-none text-text font-medium cursor-pointer"
        >
          <option value="week">Semana</option>
          <option value="month">Mes</option>
          <option value="year">Año</option>
        </select>
      </div>

      {/* Toggle de comparación */}
      <button
        onClick={() => updateFilter('compare', comparePeriods ? 'false' : 'true')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          comparePeriods
            ? 'bg-primary text-white'
            : 'bg-background text-text-secondary border border-border hover:bg-border'
        }`}
      >
        <GitCompare className="w-4 h-4" />
        <span>Comparar</span>
      </button>
    </div>
  )
}

