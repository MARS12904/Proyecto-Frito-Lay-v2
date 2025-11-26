'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'

interface ReportsChartsProps {
  revenueData: Array<{ period: string; current: number; previous?: number }>
  ordersData: Array<{ period: string; current: number; previous?: number }>
  periodType: 'week' | 'month' | 'year'
}

export default function ReportsCharts({ revenueData, ordersData, periodType }: ReportsChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders'>('revenue')

  const currentData = selectedMetric === 'revenue' ? revenueData : ordersData
  const hasComparison = currentData.some(d => d.previous !== undefined)

  // Calcular crecimiento
  const totalCurrent = currentData.reduce((sum, d) => sum + d.current, 0)
  const totalPrevious = currentData.reduce((sum, d) => sum + (d.previous || 0), 0)
  const growth = totalPrevious > 0 
    ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 
    : 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="text-text font-medium mb-2">{payload[0].payload.period}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {selectedMetric === 'revenue' 
                ? formatCurrency(entry.value) 
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Selector de métrica */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedMetric('revenue')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'revenue'
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary hover:bg-border'
          }`}
        >
          Ingresos
        </button>
        <button
          onClick={() => setSelectedMetric('orders')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'orders'
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary hover:bg-border'
          }`}
        >
          Pedidos
        </button>
      </div>

      {/* Indicador de crecimiento */}
      {hasComparison && (
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">
                {selectedMetric === 'revenue' ? 'Ingresos' : 'Pedidos'} Totales
              </p>
              <p className="text-2xl font-bold text-text">
                {selectedMetric === 'revenue' 
                  ? formatCurrency(totalCurrent)
                  : totalCurrent.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-secondary text-sm mb-1">vs Período Anterior</p>
              <div className={`flex items-center gap-1 ${growth >= 0 ? 'text-success' : 'text-error'}`}>
                {growth >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="text-xl font-bold">
                  {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfica de líneas con comparación */}
      {hasComparison ? (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-bold text-text mb-4">
            Comparación de {selectedMetric === 'revenue' ? 'Ingresos' : 'Pedidos'}
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="period" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => 
                  selectedMetric === 'revenue' 
                    ? `S/. ${value.toLocaleString()}` 
                    : value.toLocaleString()
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="current"
                name="Período Actual"
                stroke="#E31837"
                strokeWidth={2}
                dot={{ fill: '#E31837', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                name="Período Anterior"
                stroke="#6B7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#6B7280', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-bold text-text mb-4">
            {selectedMetric === 'revenue' ? 'Ingresos' : 'Pedidos'} por {periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : 'Año'}
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E31837" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E31837" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="period" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => 
                  selectedMetric === 'revenue' 
                    ? `S/. ${value.toLocaleString()}` 
                    : value.toLocaleString()
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="current"
                name={selectedMetric === 'revenue' ? 'Ingresos' : 'Pedidos'}
                stroke="#E31837"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCurrent)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfica de barras */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-bold text-text mb-4">
          {selectedMetric === 'revenue' ? 'Ingresos' : 'Pedidos'} por {periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : 'Año'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={currentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="period" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => 
                selectedMetric === 'revenue' 
                  ? `S/. ${value.toLocaleString()}` 
                  : value.toLocaleString()
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="current" 
              name={selectedMetric === 'revenue' ? 'Ingresos' : 'Pedidos'}
              fill="#E31837"
              radius={[8, 8, 0, 0]}
            />
            {hasComparison && (
              <Bar 
                dataKey="previous" 
                name="Período Anterior"
                fill="#9CA3AF"
                radius={[8, 8, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


