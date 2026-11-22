import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw,
  Filter, ChevronLeft, ChevronRight, Calendar, X, Check,
  ShieldAlert, ShieldCheck
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, getDaysInMonth } from 'date-fns';
import { cn } from '../lib/utils';

// ─── Supabase ────────────────────────────────────────────────────────────────


// ─── Types ───────────────────────────────────────────────────────────────────
type Severity = 'critical' | 'warning';

interface SchedulingConflict {
  id: string;
  roster_period_id: string;
  employee_id?: string | null;
  date: string;
  conflict_type: string;
  description: string;
  severity: Severity;
  is_resolved: boolean;
  suggested_action?: string | null;
  brand?: { brand_name: string } | null;
  process?: { name: string } | null;
  employee?: { full_name: string } | null;
}

interface RosterPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
interface ToastMsg { id: string; type: 'success' | 'error' | 'info'; title: string; message?: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = (type: ToastMsg['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  return {
    toasts, dismiss: (id: string) => setToasts(prev => prev.filter(t => t.id !== id)),
    success: (t: string, m?: string) => show('success', t, m),
    error: (t: string, m?: string) => show('error', t, m),
    info: (t: string, m?: string) => show('info', t, m),
  };
}

function ToastContainer({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cn('flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[280px] border',
          t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        )}>
          <div className="flex-1"><p className="font-medium text-sm">{t.title}</p>{t.message && <p className="text-xs opacity-80">{t.message}</p>}</div>
          <button onClick={() => dismiss(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn('bg-white rounded-xl border p-4 flex items-center gap-4', color)}>
      <div className="p-2 rounded-lg bg-current/10">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-80">{label}</p>
      </div>
    </div>
  );
}

// ─── Conflict Card ────────────────────────────────────────────────────────────
function ConflictCard({
  conflict, onResolve, isResolving,
}: {
  conflict: SchedulingConflict;
  onResolve: (id: string) => void;
  isResolving: boolean;
}) {
  const isCritical = conflict.severity === 'critical';
  return (
    <div className={cn('bg-white rounded-xl border p-4 flex flex-col gap-3 shadow-sm', isCritical ? 'border-red-200' : 'border-amber-200')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn('p-1.5 rounded-lg shrink-0', isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600')}>
            {isCritical ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', isCritical ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>
                {isCritical ? 'Critical' : 'Warning'}
              </span>
              <span className="text-xs text-gray-500 font-mono">{conflict.conflict_type}</span>
              <span className="text-xs text-gray-500">{conflict.date}</span>
            </div>
            <p className="text-sm font-medium text-gray-800">{conflict.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              {conflict.employee && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  {conflict.employee.full_name}
                </span>
              )}
              {conflict.brand && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  {conflict.brand.brand_name}
                </span>
              )}
              {conflict.process && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {conflict.process.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onResolve(conflict.id)}
          disabled={isResolving}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 hover:border-green-400 hover:text-green-700 transition-colors disabled:opacity-50"
        >
          <Check size={13} /> Resolve
        </button>
      </div>
      {conflict.suggested_action && (
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start gap-2">
          <Info size={12} className="shrink-0 mt-0.5" />
          <span><strong>Suggested:</strong> {conflict.suggested_action}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Coverage() {
  const qc = useQueryClient();
  const toast = useToast();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(startOfMonth(now));
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    severity: '' as '' | Severity,
    brand: '',
    dateFrom: '',
    dateTo: '',
    showResolved: false,
  });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // ── Data ──
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['coverage', month, year],
    queryFn: async () => {
      const { data: period } = await supabase
        .from('roster_periods')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .single();

      if (!period) return { period: null, conflicts: [] as SchedulingConflict[], resolved: 0 };

      const { data: allConflicts } = await supabase
        .from('scheduling_conflicts')
        .select('*, employee:employees(full_name), brand:brands(brand_name), process:processes(name)')
        .eq('roster_period_id', period.id)
        .order('severity', { ascending: true })
        .order('date', { ascending: true });

      const conflicts = allConflicts ?? [];
      const resolved = conflicts.filter(c => c.is_resolved).length;
      return { period: period as RosterPeriod, conflicts: conflicts as SchedulingConflict[], resolved };
    },
  });

  // ── Computed ──
  const { period, conflicts = [], resolved = 0 } = data ?? {};

  const filtered = useMemo(() => {
    return conflicts.filter(c => {
      if (!filters.showResolved && c.is_resolved) return false;
      if (filters.showResolved && !c.is_resolved) return false;
      if (filters.severity && c.severity !== filters.severity) return false;
      if (filters.dateFrom && c.date < filters.dateFrom) return false;
      if (filters.dateTo && c.date > filters.dateTo) return false;
      if (filters.brand && c.brand?.brand_name !== filters.brand) return false;
      return true;
    });
  }, [conflicts, filters]);

  const active = conflicts.filter(c => !c.is_resolved);
  const critical = active.filter(c => c.severity === 'critical').length;
  const warnings = active.filter(c => c.severity === 'warning').length;

  const groupedByDate = useMemo(() => {
    const map = new Map<string, SchedulingConflict[]>();
    for (const c of filtered) {
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const availableBrands = useMemo(() => {
    const s = new Set<string>();
    conflicts.forEach(c => c.brand?.brand_name && s.add(c.brand.brand_name));
    return Array.from(s);
  }, [conflicts]);

  // ── Mutations ──
  const resolveConflict = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduling_conflicts')
        .update({ is_resolved: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coverage'] }); toast.success('Conflict resolved'); },
    onError: (e: any) => toast.error('Failed to resolve', e.message),
  });

  const revalidate = useMutation({
    mutationFn: async () => {
      if (!period) throw new Error('No period found');
      // Re-query and validate entries
      const { data: entries } = await supabase
        .from('roster_entries')
        .select('*, employee:employees(id, full_name, weekly_off_day)')
        .eq('roster_period_id', period.id);

      // Check for basic conflicts: employee scheduled on weekly_off day
      const newConflicts: Omit<SchedulingConflict, 'id'>[] = [];
      const daysInMonth = getDaysInMonth(new Date(year, month - 1));

      for (const entry of entries ?? []) {
        if (entry.schedule_status === 'working' && entry.employee?.weekly_off_day !== null) {
          const dayOfWeek = new Date(entry.date).getDay();
          if (dayOfWeek === entry.employee.weekly_off_day) {
            newConflicts.push({
              roster_period_id: period.id,
              employee_id: entry.employee_id,
              date: entry.date,
              conflict_type: 'weekly_off_violation',
              description: `${entry.employee?.full_name} is scheduled to work on their weekly off day`,
              severity: 'warning',
              is_resolved: false,
              suggested_action: 'Change schedule to weekly off or reassign',
            });
          }
        }
      }

      // Clear unresolved and add new
      await supabase.from('scheduling_conflicts').delete().eq('roster_period_id', period.id).eq('is_resolved', false);
      if (newConflicts.length > 0) {
        await supabase.from('scheduling_conflicts').insert(newConflicts);
      }
      return newConflicts.length;
    },
    onSuccess: count => {
      qc.invalidateQueries({ queryKey: ['coverage'] });
      toast.success('Revalidation complete', `${count} conflict(s) found`);
    },
    onError: (e: any) => toast.error('Revalidation failed', e.message),
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />

      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Coverage & Conflicts</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and resolve scheduling conflicts</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Month Picker */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-1.5 hover:bg-white rounded-md">
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-sm text-gray-800 px-2 min-w-[110px] text-center flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" />
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1.5 hover:bg-white rounded-md">
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowFilter(o => !o)}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium', showFilter ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}
            >
              <Filter size={14} /> Filters
            </button>
            <button
              onClick={() => revalidate.mutate()}
              disabled={revalidate.isPending || !period}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={revalidate.isPending ? 'animate-spin' : ''} />
              {revalidate.isPending ? 'Validating...' : 'Revalidate'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600"><AlertCircle size={20} /></div>
          <div><p className="text-2xl font-bold text-gray-900">{active.length}</p><p className="text-xs text-gray-500">Total Conflicts</p></div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 text-red-600"><ShieldAlert size={20} /></div>
          <div><p className="text-2xl font-bold text-red-700">{critical}</p><p className="text-xs text-red-500">Critical Issues</p></div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600"><AlertTriangle size={20} /></div>
          <div><p className="text-2xl font-bold text-amber-700">{warnings}</p><p className="text-xs text-amber-500">Warnings</p></div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 text-green-600"><ShieldCheck size={20} /></div>
          <div><p className="text-2xl font-bold text-green-700">{resolved}</p><p className="text-xs text-green-500">Resolved Issues</p></div>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilter && (
        <div className="mx-6 mb-4 bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Severity</label>
            <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value as any }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Brand</label>
            <select value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Brands</option>
              {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none self-end pb-2">
            <input type="checkbox" checked={filters.showResolved} onChange={e => setFilters(f => ({ ...f, showResolved: e.target.checked }))} className="accent-indigo-600" />
            Show resolved
          </label>
          <button onClick={() => setFilters({ severity: '', brand: '', dateFrom: '', dateTo: '', showResolved: false })}
            className="text-sm text-indigo-600 hover:text-indigo-800 self-end pb-2">Clear</button>
        </div>
      )}

      {/* ── Conflicts List ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw size={24} className="animate-spin mr-2" /> Loading conflicts...
          </div>
        ) : !period ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Calendar size={40} className="mb-3" />
            <p className="font-medium">No roster for this period</p>
            <p className="text-sm mt-1">Generate a roster first on the Roster page</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <CheckCircle size={40} className="mb-3 text-green-400" />
            <p className="font-medium text-green-600">{filters.showResolved ? 'No resolved conflicts' : 'No active conflicts!'}</p>
            <p className="text-sm mt-1 text-gray-400">{filters.showResolved ? 'Nothing has been resolved yet' : 'The roster looks clean for this period'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedByDate.map(([date, dateConflicts]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-500 px-2 py-1 bg-gray-100 rounded-full">
                    {format(new Date(date + 'T00:00:00'), 'EEEE, dd MMMM yyyy')}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="flex flex-col gap-3">
                  {dateConflicts.map(c => (
                    <ConflictCard
                      key={c.id}
                      conflict={c}
                      onResolve={id => resolveConflict.mutate(id)}
                      isResolving={resolveConflict.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
