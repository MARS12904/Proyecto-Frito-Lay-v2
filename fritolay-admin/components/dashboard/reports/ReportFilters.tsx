'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, GitCompare, ChevronLeft, ChevronRight } from 'lucide-react'

interface ReportFiltersProps {
  currentPeriod: 'week' | 'month' | 'year'
  comparePeriods: boolean
  periodOffset: number
  periodLabel: string
}

export default function ReportFilters({ 
  currentPeriod, 
  comparePeriods, 
  periodOffset,
  periodLabel 
}: ReportFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`/dashboard/reportes?${params.toString()}`)
  }

  const handlePeriodChange = (newPeriod: string) => {
    // Al cambiar el tipo de período, resetear el offset
    updateFilter({ period: newPeriod, offset: '0' })
  }

  const handleOffsetChange = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? periodOffset + 1 : Math.max(0, periodOffset - 1)
    updateFilter({ offset: newOffset.toString() })
  }

  const handleQuickSelect = (offset: number) => {
    updateFilter({ offset: offset.toString() })
  }

  // Generar opciones rápidas según el tipo de período
  const getQuickOptions = () => {
    const now = new Date()
    const options: { label: string; offset: number }[] = []

    if (currentPeriod === 'month') {
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
        options.push({ label: label.charAt(0).toUpperCase() + label.slice(1), offset: i })
      }
    } else if (currentPeriod === 'week') {
      for (let i = 0; i < 4; i++) {
        if (i === 0) {
          options.push({ label: 'Esta semana', offset: 0 })
        } else if (i === 1) {
          options.push({ label: 'Semana pasada', offset: 1 })
        } else {
          options.push({ label: `Hace ${i} semanas`, offset: i })
        }
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const year = now.getFullYear() - i
        options.push({ label: year.toString(), offset: i })
      }
    }

    return options
  }

  const quickOptions = getQuickOptions()

  return (
    <div className="flex flex-col gap-4">
      {/* Fila principal de controles */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Selector de tipo de período */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
          <Calendar className="w-4 h-4 text-text-secondary" />
          <select
            value={currentPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="bg-transparent border-none outline-none text-text font-medium cursor-pointer"
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </select>
        </div>

        {/* Navegación de período */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg">
          <button
            onClick={() => handleOffsetChange('prev')}
            className="p-2 hover:bg-background rounded-l-lg transition-colors"
            title="Período anterior"
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary" />
          </button>
          
          <span className="px-4 py-2 font-medium text-text min-w-[180px] text-center">
            {periodLabel}
          </span>
          
          <button
            onClick={() => handleOffsetChange('next')}
            disabled={periodOffset === 0}
            className={`p-2 rounded-r-lg transition-colors ${
              periodOffset === 0 
                ? 'text-text-secondary/30 cursor-not-allowed' 
                : 'hover:bg-background text-text-secondary'
            }`}
            title="Período siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle de comparación */}
        <button
          onClick={() => updateFilter({ compare: comparePeriods ? 'false' : 'true' })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            comparePeriods
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary border border-border hover:bg-border'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Comparar con anterior</span>
        </button>
      </div>

      {/* Opciones rápidas */}
      <div className="flex flex-wrap gap-2">
        {quickOptions.map((option) => (
          <button
            key={option.offset}
            onClick={() => handleQuickSelect(option.offset)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              periodOffset === option.offset
                ? 'bg-primary text-white'
                : 'bg-background text-text-secondary border border-border hover:bg-border'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
