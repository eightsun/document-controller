'use client'

import { useState, useMemo } from 'react'
import {
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  TrendingUp,
  Calendar,
  Users,
  Filter,
  ChevronDown,
  Timer,
  BadgeCheck,
} from 'lucide-react'

interface DocSummary {
  id: string
  created_at: string
  status: string
  department_id: string | null
  department_name: string | null
  document_type_name: string | null
  document_type_code: string | null
}

interface RecentActivity {
  id: string
  event_type: string
  event_title: string
  created_at: string
  document_number: string | null
  document_title: string | null
}

interface ReviewerAssignment {
  assignment_id: string
  user_id: string
  document_id: string
  assigned_at: string
  is_completed: boolean
  completed_at: string | null
  reviewer_name: string
  reviewer_email: string | null
  reviewer_department: string | null
  document_status: string
  /** submitted_at from document_reviews — used for SLA; may be null */
  review_submitted_at: string | null
}

const BPM_DEPARTMENT = 'Business Process Management'

interface Props {
  documents: DocSummary[]
  recentActivity: RecentActivity[]
  reviewerAssignments: ReviewerAssignment[]
}

// Status group definitions
const STATUS_GROUPS = [
  { key: 'initiation', label: 'Initiation',             statuses: ['Initiation'],                     color: '#94a3b8' },
  { key: 'review',     label: 'Review / Waiting Approv', statuses: ['Review', 'Waiting Approval'],     color: '#60a5fa' },
  { key: 'approved',   label: 'Approved',                statuses: ['Approved'],                       color: '#34d399' },
  { key: 'training',   label: 'Training',                statuses: ['Training'],                       color: '#a78bfa' },
  { key: 'closed',     label: 'Closed (Valid)',           statuses: ['Closed'],                         color: '#2dd4bf' },
  { key: 'rejected',   label: 'Rejected / Cancelled',    statuses: ['Rejected', 'Cancel', 'Obsolete'], color: '#f87171' },
]

const PUBLISHED_STATUSES = new Set(['Approved', 'Training', 'Closed'])

function getStatusGroup(status: string) {
  return STATUS_GROUPS.find(g => g.statuses.includes(status))
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

function formatSLA(days: number | null): string {
  if (days === null) return '—'
  if (days < 1) return '< 1 day'
  return `${days.toFixed(1)}d`
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').substring(0, 2).toUpperCase()
}

export default function ReportsClient({ documents, recentActivity, reviewerAssignments }: Props) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(currentYear)

  // Last 24 months (newest first)
  const monthOptions: { label: string; year: number; month: number }[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(currentYear, currentMonth - i, 1)
    monthOptions.push({ label: formatMonthLabel(d.getFullYear(), d.getMonth()), year: d.getFullYear(), month: d.getMonth() })
  }

  const yearOptions: number[] = []
  for (let y = 2023; y <= currentYear; y++) yearOptions.push(y)

  // ── Period-filtered documents ────────────────────────────────────
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const created = new Date(doc.created_at)
      if (periodType === 'yearly') return created.getFullYear() === selectedYear
      return created.getFullYear() === selectedMonthYear && created.getMonth() === selectedMonth
    })
  }, [documents, periodType, selectedYear, selectedMonth, selectedMonthYear])

  const totalCount = filteredDocs.length
  const publishedCount = filteredDocs.filter(d => PUBLISHED_STATUSES.has(d.status)).length
  const rejectedCount = filteredDocs.filter(d => ['Rejected', 'Cancel'].includes(d.status)).length
  const inProgressCount = filteredDocs.filter(d => ['Initiation', 'Review', 'Waiting Approval'].includes(d.status)).length

  // ── Trend chart ──────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (periodType === 'yearly') {
      return MONTH_NAMES.map((label, monthIdx) => ({
        label,
        count: filteredDocs.filter(doc => new Date(doc.created_at).getMonth() === monthIdx).length,
      }))
    }
    const daysInMonth = new Date(selectedMonthYear, selectedMonth + 1, 0).getDate()
    const weekDefs = [
      { label: 'Week 1', start: 1,  end: 7  },
      { label: 'Week 2', start: 8,  end: 14 },
      { label: 'Week 3', start: 15, end: 21 },
      { label: 'Week 4', start: 22, end: 28 },
      { label: 'Week 5', start: 29, end: daysInMonth },
    ]
    return weekDefs
      .filter(w => w.start <= daysInMonth)
      .map(w => ({
        label: w.label,
        count: filteredDocs.filter(doc => {
          const day = new Date(doc.created_at).getDate()
          return day >= w.start && day <= Math.min(w.end, daysInMonth)
        }).length,
      }))
  }, [filteredDocs, periodType, selectedYear, selectedMonth, selectedMonthYear])

  // ── Department stacked bars ──────────────────────────────────────
  const departmentData = useMemo(() => {
    const deptMap: Record<string, { name: string; groups: Record<string, number>; total: number }> = {}
    for (const doc of filteredDocs) {
      const key = doc.department_id || '__none__'
      if (!deptMap[key]) {
        deptMap[key] = { name: doc.department_name || 'No Department', groups: {}, total: 0 }
        for (const g of STATUS_GROUPS) deptMap[key].groups[g.key] = 0
      }
      const group = getStatusGroup(doc.status)
      if (group) deptMap[key].groups[group.key]++
      deptMap[key].total++
    }
    return Object.values(deptMap).sort((a, b) => b.total - a.total)
  }, [filteredDocs])

  const maxDeptCount = Math.max(...departmentData.map(d => d.total), 1)

  // ── Document type breakdown ──────────────────────────────────────
  const typeData = useMemo(() => {
    const typeMap: Record<string, { name: string; code: string | null; count: number }> = {}
    for (const doc of filteredDocs) {
      const name = doc.document_type_name || 'Unknown'
      if (!typeMap[name]) typeMap[name] = { name, code: doc.document_type_code, count: 0 }
      typeMap[name].count++
    }
    return Object.values(typeMap).sort((a, b) => b.count - a.count)
  }, [filteredDocs])

  const maxTrendCount = Math.max(...trendData.map(d => d.count), 1)

  // ── Reviewer workload (period-aware) ─────────────────────────────
  const workloadData = useMemo(() => {
    type Entry = {
      user_id: string
      name: string
      email: string | null
      completedInPeriod: number
      pendingTotal: number
      slaSum: number
      slaCount: number
      avgSlaDays: number | null
      ledToPublished: number      // all-time: completed where doc is now published
      allTimeCompleted: number    // all completed assignments regardless of period
    }

    const map: Record<string, Entry> = {}

    for (const a of reviewerAssignments) {
      // Only include reviewers from the BPM department
      if (a.reviewer_department !== BPM_DEPARTMENT) continue

      if (!map[a.user_id]) {
        map[a.user_id] = {
          user_id: a.user_id, name: a.reviewer_name, email: a.reviewer_email,
          completedInPeriod: 0, pendingTotal: 0,
          slaSum: 0, slaCount: 0, avgSlaDays: null,
          ledToPublished: 0, allTimeCompleted: 0,
        }
      }
      const e = map[a.user_id]

      // Pending (current backlog — all-time, not period-filtered)
      if (!a.is_completed) {
        e.pendingTotal++
        continue
      }

      // Below: is_completed = true
      e.allTimeCompleted++

      // Led to published (all-time)
      if (PUBLISHED_STATUSES.has(a.document_status)) e.ledToPublished++

      // Period filter: use submitted_at (most accurate) or completed_at as fallback
      const completionTs = a.review_submitted_at || a.completed_at
      if (!completionTs) continue

      const completedDate = new Date(completionTs)
      const inPeriod =
        periodType === 'yearly'
          ? completedDate.getFullYear() === selectedYear
          : completedDate.getFullYear() === selectedMonthYear && completedDate.getMonth() === selectedMonth

      if (!inPeriod) continue

      e.completedInPeriod++

      // SLA: submitted_at − assigned_at (days)
      if (a.review_submitted_at) {
        const slaDays =
          (new Date(a.review_submitted_at).getTime() - new Date(a.assigned_at).getTime()) / 86_400_000
        if (slaDays >= 0) { e.slaSum += slaDays; e.slaCount++ }
      }
    }

    return Object.values(map)
      .map(e => ({ ...e, avgSlaDays: e.slaCount > 0 ? e.slaSum / e.slaCount : null }))
      .sort((a, b) => b.completedInPeriod - a.completedInPeriod || b.pendingTotal - a.pendingTotal)
  }, [reviewerAssignments, periodType, selectedYear, selectedMonth, selectedMonthYear])

  // ── Helpers ──────────────────────────────────────────────────────
  const handleMonthSelect = (value: string) => {
    const [yearStr, monthStr] = value.split('-')
    setSelectedMonthYear(parseInt(yearStr))
    setSelectedMonth(parseInt(monthStr))
  }

  const selectedMonthValue = `${selectedMonthYear}-${selectedMonth}`

  const periodLabel =
    periodType === 'yearly'
      ? `Year ${selectedYear}`
      : formatMonthLabel(selectedMonthYear, selectedMonth)

  const formatActivityDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })

  const getActivityIconColor = (eventType: string) => {
    if (eventType.includes('approved') || eventType === 'approved') return { bg: 'bg-emerald-100', icon: <CheckCircle className="w-3 h-3 text-emerald-600" /> }
    if (eventType.includes('rejected') || eventType === 'rejected') return { bg: 'bg-red-100', icon: <XCircle className="w-3 h-3 text-red-600" /> }
    if (eventType.includes('training')) return { bg: 'bg-violet-100', icon: <Users className="w-3 h-3 text-violet-600" /> }
    if (eventType.includes('review')) return { bg: 'bg-blue-100', icon: <Clock className="w-3 h-3 text-blue-600" /> }
    return { bg: 'bg-slate-100', icon: <FileText className="w-3 h-3 text-slate-600" /> }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Reports &amp; Analytics</h1>
        </div>
        <p className="text-slate-500">Interactive overview filtered by period</p>
      </div>

      {/* Period Filter */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Period:</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${periodType === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >Monthly</button>
          <button
            onClick={() => setPeriodType('yearly')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${periodType === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >Yearly</button>
        </div>
        <div className="relative">
          {periodType === 'monthly' ? (
            <div className="relative">
              <select value={selectedMonthValue} onChange={e => handleMonthSelect(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                {monthOptions.map(opt => (
                  <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <div className="relative">
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-slate-500">
            Showing data for <span className="font-semibold text-slate-700">{periodLabel}</span>
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
            <span className="text-xs text-slate-400 font-medium">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalCount}</p>
          <p className="text-sm text-slate-500 mt-1">Total Documents</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
            <span className="text-xs text-emerald-600 font-medium">
              {totalCount > 0 ? ((publishedCount / totalCount) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{publishedCount}</p>
          <p className="text-sm text-slate-500 mt-1">Published / Valid</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
            <span className="text-xs text-red-600 font-medium">
              {totalCount > 0 ? ((rejectedCount / totalCount) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{rejectedCount}</p>
          <p className="text-sm text-slate-500 mt-1">Rejected / Cancelled</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
            <span className="text-xs text-amber-600 font-medium">
              {totalCount > 0 ? ((inProgressCount / totalCount) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{inProgressCount}</p>
          <p className="text-sm text-slate-500 mt-1">In Progress</p>
        </div>
      </div>

      {/* Monthly / Weekly Trend */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {periodType === 'yearly'
              ? `Monthly Breakdown — ${selectedYear}`
              : `Weekly Breakdown — ${formatMonthLabel(selectedMonthYear, selectedMonth)}`}
          </h2>
        </div>
        {trendData.every(d => d.count === 0) ? (
          <div className="py-10 text-center text-slate-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>No documents created in this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trendData.map((item, idx) => {
              const percentage = (item.count / maxTrendCount) * 100
              return (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-16 shrink-0 text-right">{item.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end px-3 transition-all duration-500"
                      style={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%`, background: 'linear-gradient(to right, #6366f1, #a78bfa)' }}
                    >
                      {item.count > 0 && <span className="text-xs font-semibold text-white">{item.count}</span>}
                    </div>
                  </div>
                  {item.count === 0 && <span className="text-xs text-slate-400 w-6">0</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* By Department — Stacked Bar */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800">By Department</h2>
          <span className="ml-auto text-xs text-slate-400">{filteredDocs.length} documents</span>
        </div>
        {departmentData.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>No department data for this period</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {departmentData.map((dept, idx) => {
                const barWidthPercent = (dept.total / maxDeptCount) * 100
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 shrink-0 truncate" style={{ width: '140px' }} title={dept.name}>
                      {dept.name}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-7 flex rounded overflow-hidden" style={{ width: `${Math.max(barWidthPercent, 2)}%` }}>
                        {STATUS_GROUPS.map(group => {
                          const count = dept.groups[group.key] || 0
                          if (count === 0) return null
                          const segmentPct = (count / dept.total) * 100
                          return (
                            <div
                              key={group.key}
                              className="h-full flex items-center justify-center overflow-hidden"
                              style={{ width: `${segmentPct}%`, backgroundColor: group.color, minWidth: '4px' }}
                              title={`${group.label}: ${count}`}
                            >
                              <SegmentLabel count={count} segmentPct={segmentPct} barWidthPercent={barWidthPercent} />
                            </div>
                          )
                        })}
                      </div>
                      <span className="text-sm font-semibold text-slate-600 shrink-0 w-8 text-right">{dept.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100">
              {STATUS_GROUPS.map(group => (
                <div key={group.key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="text-xs text-slate-600">{group.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* By Document Type + Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-800">By Document Type</h2>
          </div>
          {typeData.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p>No document type data for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {typeData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.code && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-mono rounded shrink-0">{item.code}</span>
                    )}
                    <span className="text-sm text-slate-700 truncate">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800 shrink-0 ml-3">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
            <span className="ml-auto text-xs text-slate-400">Latest 10 events</span>
          </div>
          {recentActivity.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {recentActivity.slice(0, 10).map(activity => {
                const { bg, icon } = getActivityIconColor(activity.event_type)
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`p-1.5 rounded-full shrink-0 ${bg}`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{activity.event_title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {activity.document_number && <span className="font-mono">{activity.document_number}</span>}
                        {activity.document_number && activity.document_title && <span className="mx-1">—</span>}
                        {activity.document_title && <span className="truncate">{activity.document_title}</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatActivityDate(activity.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Review Team Workload ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">BPM Review Team Workload</h2>
          <span className="ml-auto text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {periodLabel}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-6 pl-1">
          Business Process Management department · Completed &amp; SLA filtered by selected period · Pending shows current backlog · Published rate is all-time
        </p>

        {workloadData.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p>No review assignments found for BPM team members</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_80px_72px_80px_100px] gap-3 px-3 mb-2 text-xs text-slate-400 font-semibold uppercase tracking-wide">
              <span>Reviewer</span>
              <span className="text-center">Completed</span>
              <span className="text-center">Pending</span>
              <span className="text-center">Avg SLA</span>
              <span className="text-center">Published</span>
            </div>

            <div className="divide-y divide-slate-100">
              {workloadData.map((reviewer, idx) => (
                <div
                  key={reviewer.user_id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_80px_72px_80px_100px] gap-3 items-center py-3 px-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {/* Reviewer identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">{initials(reviewer.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{reviewer.name}</p>
                      {reviewer.email && (
                        <p className="text-xs text-slate-400 truncate">{reviewer.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Completed in period */}
                  <div className="flex sm:flex-col items-center sm:items-center gap-2">
                    <span className="text-xs text-slate-400 sm:hidden">Completed:</span>
                    <div className="flex flex-col items-center">
                      <span className={`text-xl font-bold ${reviewer.completedInPeriod > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {reviewer.completedInPeriod}
                      </span>
                      <div className="w-10 h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${Math.min((reviewer.completedInPeriod / Math.max(...workloadData.map(w => w.completedInPeriod), 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pending backlog */}
                  <div className="flex sm:flex-col items-center sm:items-center gap-2">
                    <span className="text-xs text-slate-400 sm:hidden">Pending:</span>
                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${
                      reviewer.pendingTotal > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {reviewer.pendingTotal}
                    </span>
                  </div>

                  {/* Avg SLA */}
                  <div className="flex sm:flex-col items-center sm:items-center gap-2">
                    <span className="text-xs text-slate-400 sm:hidden">Avg SLA:</span>
                    <div className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={`text-sm font-semibold ${
                        reviewer.avgSlaDays === null ? 'text-slate-300'
                          : reviewer.avgSlaDays <= 3 ? 'text-emerald-600'
                          : reviewer.avgSlaDays <= 7 ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {formatSLA(reviewer.avgSlaDays)}
                      </span>
                    </div>
                  </div>

                  {/* Led to published (all-time) */}
                  <div className="flex sm:flex-col items-center sm:items-center gap-2">
                    <span className="text-xs text-slate-400 sm:hidden">Published:</span>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <BadgeCheck className={`w-4 h-4 shrink-0 ${reviewer.ledToPublished > 0 ? 'text-teal-500' : 'text-slate-300'}`} />
                        <span className={`text-sm font-bold ${reviewer.ledToPublished > 0 ? 'text-teal-700' : 'text-slate-400'}`}>
                          {reviewer.ledToPublished}
                        </span>
                      </div>
                      {reviewer.allTimeCompleted > 0 && (
                        <span className="text-xs text-slate-400 mt-0.5">
                          {((reviewer.ledToPublished / reviewer.allTimeCompleted) * 100).toFixed(0)}% rate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Completed — reviews finished in selected period</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Pending — current open review backlog</span>
              <span className="flex items-center gap-1.5"><Timer className="w-3 h-3" />SLA — avg days from assignment to submission (≤3d green, ≤7d amber, &gt;7d red)</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-3 h-3 text-teal-500" />Published — completed reviews where doc reached Approved/Training/Closed (all-time)</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Stacked bar segment label — only render if estimated pixel width ≥ 30px
function SegmentLabel({ count, segmentPct, barWidthPercent }: { count: number; segmentPct: number; barWidthPercent: number }) {
  const estimatedPx = (segmentPct / 100) * (barWidthPercent / 100) * 600
  if (estimatedPx < 30) return null
  return <span className="text-xs font-semibold text-white select-none">{count}</span>
}
