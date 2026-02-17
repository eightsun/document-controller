'use client'

interface MonthlyTrendData {
  month: string
  created: number
  approved: number
}

interface StatusData {
  name: string
  value: number
  color: string
}

interface DashboardChartsProps {
  monthlyTrend: MonthlyTrendData[]
  statusData: StatusData[]
}

export default function DashboardCharts({ monthlyTrend, statusData }: DashboardChartsProps) {
  // Check if there's data to show
  const hasMonthlyData = monthlyTrend.some(m => m.created > 0 || m.approved > 0)
  const maxValue = Math.max(...monthlyTrend.map(m => Math.max(m.created, m.approved)), 1)

  if (!hasMonthlyData) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-sm">No monthly activity data yet</p>
          <p className="text-xs text-slate-300 mt-1">Create documents to see trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between gap-2 h-48">
        {monthlyTrend.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end justify-center h-36">
              {/* Created bar */}
              <div 
                className="w-4 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${(item.created / maxValue) * 100}%`, minHeight: item.created > 0 ? '4px' : '0' }}
                title={`Created: ${item.created}`}
              />
              {/* Approved bar */}
              <div 
                className="w-4 bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
                style={{ height: `${(item.approved / maxValue) * 100}%`, minHeight: item.approved > 0 ? '4px' : '0' }}
                title={`Approved: ${item.approved}`}
              />
            </div>
            <span className="text-xs text-slate-500 truncate w-full text-center">{item.month.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-xs text-slate-600">Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded" />
          <span className="text-xs text-slate-600">Approved</span>
        </div>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">
            {monthlyTrend.reduce((sum, m) => sum + m.created, 0)}
          </p>
          <p className="text-xs text-slate-500">Total Created (6mo)</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">
            {monthlyTrend.reduce((sum, m) => sum + m.approved, 0)}
          </p>
          <p className="text-xs text-slate-500">Total Approved (6mo)</p>
        </div>
      </div>
    </div>
  )
}
