import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, ChevronLeft, ChevronRight, Play, Save, Eye,
  Download, AlertTriangle, RefreshCw, Filter, X, Check,
  Users, AlertCircle
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, getDaysInMonth,
  addMonths, subMonths, getDay, parseISO, isWeekend
} from 'date-fns';
import { cn } from '../lib/utils';

// ─── Supabase client ────────────────────────────────────────────────────────


// ─── Types ───────────────────────────────────────────────────────────────────
type ScheduleStatus =
  | 'working' | 'weekly_off' | 'leave' | 'comp_off'
  | 'public_holiday' | 'not_required' | 'conflict';

interface Employee {
  id: string;
  full_name: string;
  pod_id: string | null;
  weekly_off_day: number | null;
  employment_status: string;
}

interface RosterEntry {
  id?: string;
  roster_period_id: string;
  employee_id: string;
  date: string;
  schedule_status: ScheduleStatus;
  brand_id?: string | null;
  process_id?: string | null;
  notes?: string | null;
  is_manual_override?: boolean;
  employee?: Employee & { pod?: { pod_name: string } };
  brand?: { brand_name: string } | null;
  process?: { name: string } | null;
}

interface RosterPeriod {
  id: string;
  month: number;
  year: number;
  status: 'draft' | 'published';
  generated_at?: string | null;
}

interface SchedulingConflict {
  id?: string;
  roster_period_id: string;
  employee_id?: string | null;
  date: string;
  conflict_type: string;
  description: string;
  severity: 'critical' | 'warning';
  is_resolved: boolean;
}

interface Pod {
  id: string;
  pod_name: string;
}

interface Brand {
  id: string;
  brand_name: string;
}

interface Process {
  id: string;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_ABBREV: Record<string, string> = {
  working: 'WK',
  weekly_off: 'WO',
  leave: 'LV',
  comp_off: 'CO',
  public_holiday: 'PH',
  not_required: '',
  conflict: 'CF',
};

const STATUS_COLORS: Record<string, string> = {
  working: 'bg-green-100 text-green-700 border-green-200',
  weekly_off: 'bg-slate-100 text-slate-600 border-slate-200',
  leave: 'bg-amber-100 text-amber-700 border-amber-200',
  comp_off: 'bg-purple-100 text-purple-700 border-purple-200',
  public_holiday: 'bg-blue-100 text-blue-700 border-blue-200',
  not_required: 'bg-gray-50 text-gray-400 border-gray-100',
  conflict: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  working: 'Working',
  weekly_off: 'Weekly Off',
  leave: 'Leave',
  comp_off: 'Comp Off',
  public_holiday: 'Public Holiday',
  not_required: 'Not Required',
  conflict: 'Conflict',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_OPTIONS = ['Company', 'Pod', 'Brand', 'Employee'] as const;
type ViewOption = typeof VIEW_OPTIONS[number];

// ─── Toast ───────────────────────────────────────────────────────────────────
interface ToastMsg { id: string; type: 'success' | 'error' | 'info'; title: string; message?: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = useCallback((type: ToastMsg['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  return {
    toasts,
    success: (title: string, message?: string) => show('success', title, message),
    error: (title: string, message?: string) => show('error', title, message),
    info: (title: string, message?: string) => show('info', title, message),
    dismiss: (id: string) => setToasts(prev => prev.filter(t => t.id !== id)),
  };
}

function ToastContainer({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[280px] border',
            t.type === 'success' && 'bg-green-50 border-green-200 text-green-800',
            t.type === 'error' && 'bg-red-50 border-red-200 text-red-800',
            t.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800',
          )}
        >
          <div className="flex-1">
            <p className="font-medium text-sm">{t.title}</p>
            {t.message && <p className="text-xs opacity-80 mt-0.5">{t.message}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({
  open, onClose, title, children, footer,
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Simple scheduler ────────────────────────────────────────────────────────
function buildSchedule(params: {
  month: number; year: number; periodId: string;
  employees: Employee[]; holidays: { date: string }[];
  approvedLeaves: { employee_id: string; start_date: string; end_date: string }[];
  compOffs: { employee_id: string; date: string }[];
}): { entries: RosterEntry[]; conflicts: SchedulingConflict[] } {
  const { month, year, periodId, employees, holidays, approvedLeaves, compOffs } = params;
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const entries: RosterEntry[] = [];
  const conflicts: SchedulingConflict[] = [];
  const holidayDates = new Set(holidays.map(h => h.date));

  for (const emp of employees) {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = getDay(dateObj); // 0=Sun
      let status: ScheduleStatus = 'working';

      if (holidayDates.has(dateStr)) {
        status = 'public_holiday';
      } else {
        const onLeave = approvedLeaves.some(l =>
          l.employee_id === emp.id && dateStr >= l.start_date && dateStr <= l.end_date
        );
        const onCompOff = compOffs.some(c => c.employee_id === emp.id && c.date === dateStr);
        const isWeeklyOff = emp.weekly_off_day !== null && emp.weekly_off_day !== undefined
          ? emp.weekly_off_day === dayOfWeek
          : dayOfWeek === 0;

        if (onLeave) status = 'leave';
        else if (onCompOff) status = 'comp_off';
        else if (isWeeklyOff) status = 'weekly_off';
        else status = 'working';
      }

      entries.push({
        roster_period_id: periodId,
        employee_id: emp.id,
        date: dateStr,
        schedule_status: status,
        is_manual_override: false,
      });
    }
  }

  return { entries, conflicts };
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────
function FilterSidebar({
  open, onClose, pods, brands, filters, setFilters,
}: {
  open: boolean; onClose: () => void; pods: Pod[]; brands: Brand[];
  filters: {
    pods: string[]; brand: string; search: string; status: string;
  };
  setFilters: (f: any) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white w-72 shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-gray-800">Filters</span>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="p-4 flex flex-col gap-5 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Search Employee</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              placeholder="Name..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Pod</label>
            <div className="flex flex-col gap-1">
              {pods.map(pod => (
                <label key={pod.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.pods.includes(pod.id)}
                    onChange={e => setFilters({
                      ...filters,
                      pods: e.target.checked
                        ? [...filters.pods, pod.id]
                        : filters.pods.filter(p => p !== pod.id),
                    })}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{pod.pod_name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Brand</label>
            <select
              value={filters.brand}
              onChange={e => setFilters({ ...filters, brand: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Brands</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.brand_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 border-t">
          <button
            onClick={() => setFilters({ pods: [], brand: '', search: '', status: '' })}
            className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cell Edit Modal ──────────────────────────────────────────────────────────
function CellEditModal({
  open, onClose, entry, brands, processes, onSave,
}: {
  open: boolean; onClose: () => void;
  entry: RosterEntry | null;
  brands: Brand[]; processes: Process[];
  onSave: (updated: Partial<RosterEntry>) => void;
}) {
  const [status, setStatus] = useState<ScheduleStatus>(entry?.schedule_status ?? 'working');
  const [brandId, setBrandId] = useState(entry?.brand_id ?? '');
  const [processId, setProcessId] = useState(entry?.process_id ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');

  React.useEffect(() => {
    if (entry) {
      setStatus(entry.schedule_status);
      setBrandId(entry.brand_id ?? '');
      setProcessId(entry.process_id ?? '');
      setNotes(entry.notes ?? '');
    }
  }, [entry]);

  if (!open || !entry) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Schedule Cell"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => onSave({ schedule_status: status, brand_id: brandId || null, process_id: processId || null, notes: notes || null, is_manual_override: true })}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
          >
            <Save size={14} /> Save Override
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="text-xs text-gray-500">Employee</span>
            <p className="text-sm font-medium text-gray-800">{entry.employee?.full_name ?? entry.employee_id}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Date</span>
            <p className="text-sm font-medium text-gray-800">{entry.date}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as ScheduleStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand (optional)</label>
          <select
            value={brandId}
            onChange={e => setBrandId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— None —</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Process (optional)</label>
          <select
            value={processId}
            onChange={e => setProcessId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— None —</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional override notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={13} /> This cell will be marked as a manual override and won't be overwritten by auto-generation.
        </p>
      </div>
    </Modal>
  );
}

// ─── Generate Modal ───────────────────────────────────────────────────────────
function GenerateModal({
  open, onClose, pods, onGenerate, isLoading,
}: {
  open: boolean; onClose: () => void; pods: Pod[];
  onGenerate: (podId?: string) => void; isLoading: boolean;
}) {
  const [podId, setPodId] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Roster"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => onGenerate(podId || undefined)}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          This will generate schedule entries for the selected period. Manual overrides will be preserved.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
          <select
            value={podId}
            onChange={e => setPodId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Full Company</option>
            {pods.map(p => <option key={p.id} value={p.id}>{p.pod_name}</option>)}
          </select>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Non-manual entries for this month will be overwritten. Manual overrides are safe.</span>
        </div>
      </div>
    </Modal>
  );
}

// ─── Publish Modal ────────────────────────────────────────────────────────────
function PublishModal({
  open, onClose, conflictCount, onPublish, isLoading,
}: {
  open: boolean; onClose: () => void; conflictCount: number;
  onPublish: () => void; isLoading: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish Roster"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={onPublish}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
            {isLoading ? 'Publishing...' : 'Publish Anyway'}
          </button>
        </div>
      }
    >
      {conflictCount > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="text-sm">
              <strong>{conflictCount} conflict(s)</strong> detected. Publishing will notify all employees. Conflicts will remain visible.
            </span>
          </div>
          <p className="text-sm text-gray-600">Are you sure you want to publish the roster with unresolved conflicts?</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">The roster will be published and employees will be notified. This action can be reverted by an admin.</p>
      )}
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Roster() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(startOfMonth(now));
  const [view, setView] = useState<ViewOption>('Company');
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<RosterEntry | null>(null);
  const [filters, setFilters] = useState({ pods: [] as string[], brand: '', search: '', status: '' });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ── Data ──
  const { data: podsData } = useQuery<Pod[]>({
    queryKey: ['pods'],
    queryFn: async () => {
      const { data } = await supabase.from('pods').select('*').order('pod_name');
      return data ?? [];
    },
  });

  const { data: brandsData } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').eq('status', 'active').order('brand_name');
      return data ?? [];
    },
  });

  const { data: processesData } = useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data } = await supabase.from('processes').select('*').eq('status', 'active').order('name');
      return data ?? [];
    },
  });

  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ['roster', month, year],
    queryFn: async () => {
      let { data: period } = await supabase
        .from('roster_periods')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .single();

      if (!period) return { period: null, entries: [] as RosterEntry[], conflicts: [] as SchedulingConflict[] };

      const [entriesRes, conflictsRes] = await Promise.all([
        supabase
          .from('roster_entries')
          .select('*, employee:employees(id, full_name, pod_id, weekly_off_day, employment_status), brand:brands(brand_name), process:processes(name)')
          .eq('roster_period_id', period.id)
          .order('date'),
        supabase
          .from('scheduling_conflicts')
          .select('*')
          .eq('roster_period_id', period.id)
          .eq('is_resolved', false),
      ]);

      return {
        period: period as RosterPeriod,
        entries: (entriesRes.data ?? []) as RosterEntry[],
        conflicts: (conflictsRes.data ?? []) as SchedulingConflict[],
      };
    },
  });

  // ── Computed ──
  const { period, entries, conflicts } = rosterData ?? { period: null, entries: [], conflicts: [] };

  const employees = useMemo(() => {
    const empMap = new Map<string, RosterEntry['employee']>();
    for (const e of entries) {
      if (e.employee && !empMap.has(e.employee_id)) {
        empMap.set(e.employee_id, e.employee);
      }
    }
    return Array.from(empMap.values()).filter(Boolean) as NonNullable<RosterEntry['employee']>[];
  }, [entries]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (filters.search && !emp.full_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.pods.length > 0 && emp.pod_id && !filters.pods.includes(emp.pod_id)) return false;
      return true;
    });
  }, [employees, filters]);

  const entryMap = useMemo(() => {
    const map = new Map<string, RosterEntry>();
    for (const e of entries) map.set(`${e.employee_id}:${e.date}`, e);
    return map;
  }, [entries]);

  const summary = useMemo(() => {
    const totalSlots = filteredEmployees.length * daysInMonth;
    const workingSlots = entries.filter(e =>
      filteredEmployees.some(fe => fe.id === e.employee_id) &&
      e.schedule_status === 'working'
    ).length;
    const coveredPct = totalSlots > 0 ? Math.round((workingSlots / totalSlots) * 100) : 0;
    return { totalDays: daysInMonth, workingDays: workingSlots, coverage: coveredPct, conflicts: conflicts.length };
  }, [filteredEmployees, entries, daysInMonth, conflicts]);

  // ── Mutations ──
  const generateRoster = useMutation({
    mutationFn: async ({ podId }: { podId?: string }) => {
      const { data: periodData, error: periodError } = await supabase
        .from('roster_periods')
        .upsert(
          { month, year, status: 'draft', generated_at: new Date().toISOString() },
          { onConflict: 'month,year' }
        )
        .select()
        .single();
      if (periodError) throw periodError;

      const [empsRes, leavesRes, compoffsRes, holidaysRes] = await Promise.all([
        supabase.from('employees').select('*').eq('employment_status', 'active'),
        supabase.from('leave_requests').select('*').eq('status', 'approved'),
        supabase.from('comp_offs').select('*').eq('status', 'assigned'),
        supabase.from('holidays').select('*')
          .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
          .lte('date', `${year}-${String(month).padStart(2, '0')}-31`),
      ]);

      let employees = (empsRes.data ?? []) as Employee[];
      if (podId) employees = employees.filter(e => e.pod_id === podId);

      const result = buildSchedule({
        month, year, periodId: periodData.id,
        employees,
        holidays: holidaysRes.data ?? [],
        approvedLeaves: leavesRes.data ?? [],
        compOffs: compoffsRes.data ?? [],
      });

      const batchSize = 100;
      for (let i = 0; i < result.entries.length; i += batchSize) {
        const batch = result.entries.slice(i, i + batchSize);
        await supabase
          .from('roster_entries')
          .upsert(batch, { onConflict: 'roster_period_id,employee_id,date' });
      }

      await supabase.from('scheduling_conflicts').delete().eq('roster_period_id', periodData.id);
      if (result.conflicts.length > 0) {
        await supabase.from('scheduling_conflicts').insert(result.conflicts);
      }

      return result;
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      toast.success('Roster generated!', `${result.conflicts.length} conflict(s) found`);
      setShowGenerateModal(false);
    },
    onError: (err: any) => toast.error('Generation failed', err.message),
  });

  const saveCell = useMutation({
    mutationFn: async (updated: Partial<RosterEntry> & { roster_period_id: string; employee_id: string; date: string }) => {
      const { error } = await supabase
        .from('roster_entries')
        .upsert(updated, { onConflict: 'roster_period_id,employee_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', month, year] });
      toast.success('Cell saved');
      setSelectedCell(null);
    },
    onError: (err: any) => toast.error('Save failed', err.message),
  });

  const publishRoster = useMutation({
    mutationFn: async () => {
      if (!period) throw new Error('No roster period found');
      const { error } = await supabase
        .from('roster_periods')
        .update({ status: 'published' })
        .eq('id', period.id);
      if (error) throw error;
      // Create notification records
      await supabase.from('notifications').insert({
        title: 'Roster Published',
        message: `The roster for ${format(currentDate, 'MMMM yyyy')} has been published.`,
        type: 'roster',
        is_read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', month, year] });
      toast.success('Roster published', 'Employees have been notified');
      setShowPublishModal(false);
    },
    onError: (err: any) => toast.error('Publish failed', err.message),
  });

  const exportCSV = useCallback(() => {
    const rows: string[] = [['Employee', ...days.map(d => format(new Date(year, month - 1, d), 'dd-MMM (EEE)'))].join(',')];
    for (const emp of filteredEmployees) {
      const cols = [emp.full_name, ...days.map(d => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const e = entryMap.get(`${emp.id}:${dateStr}`);
        return STATUS_ABBREV[e?.schedule_status ?? ''] ?? '';
      })];
      rows.push(cols.map(c => `"${c}"`).join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEmployees, days, entryMap, year, month]);

  const pods = podsData ?? [];
  const brands = brandsData ?? [];
  const processes = processesData ?? [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />

      {/* ── Top Bar ── */}
      <div className="bg-white border-b px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Month selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="p-1.5 hover:bg-white rounded-md transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar size={15} className="text-indigo-600" />
            <span className="font-semibold text-sm text-gray-800 min-w-[110px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="p-1.5 hover:bg-white rounded-md transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* View selector */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {VIEW_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', view === v ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-800')}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilterSidebar(true)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors', (filters.pods.length > 0 || filters.brand || filters.search || filters.status) ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}
        >
          <Filter size={14} /> Filters
          {(filters.pods.length + (filters.brand ? 1 : 0) + (filters.search ? 1 : 0) + (filters.status ? 1 : 0)) > 0 && (
            <span className="bg-indigo-600 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center ml-0.5">
              {filters.pods.length + (filters.brand ? 1 : 0) + (filters.search ? 1 : 0) + (filters.status ? 1 : 0)}
            </span>
          )}
        </button>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <Play size={14} /> Generate Roster
        </button>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['roster', month, year] })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Revalidate
        </button>
        <button
          onClick={() => setShowPublishModal(true)}
          disabled={!period || period.status === 'published'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          <Eye size={14} /> {period?.status === 'published' ? 'Published' : 'Publish'}
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {/* ── Summary Row ── */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Total Days:</span>
          <span className="font-semibold text-gray-800">{summary.totalDays}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Working Slots:</span>
          <span className="font-semibold text-gray-800">{summary.workingDays}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Coverage:</span>
          <span className={cn('font-semibold', summary.coverage >= 80 ? 'text-green-600' : summary.coverage >= 60 ? 'text-amber-600' : 'text-red-600')}>
            {summary.coverage}%
          </span>
        </div>
        {conflicts.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
            <AlertTriangle size={14} />
            {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
          </div>
        )}
        {period && (
          <span className={cn('ml-auto text-xs font-medium px-2 py-1 rounded-full', period.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
            {period.status === 'published' ? '✓ Published' : '◎ Draft'}
          </span>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="bg-white border-b px-4 py-2 flex items-center flex-wrap gap-3">
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs">
            <span className={cn('w-5 h-5 rounded flex items-center justify-center font-medium border text-[10px]', STATUS_COLORS[k])}>
              {STATUS_ABBREV[k] || '—'}
            </span>
            <span className="text-gray-600">{v}</span>
          </div>
        ))}
      </div>

      {/* ── Roster Grid ── */}
      <div className="flex-1 overflow-auto">
        {rosterLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={24} className="animate-spin text-indigo-400" />
            <span className="ml-2 text-gray-500 text-sm">Loading roster...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Users size={40} className="mb-3" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm mt-1">Generate the roster or adjust filters</p>
          </div>
        ) : (
          <div className="inline-block min-w-full">
            <table className="border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <th className="sticky left-0 z-30 bg-white border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-36 min-w-[140px]">
                    Employee
                  </th>
                  {days.map(d => {
                    const dateObj = new Date(year, month - 1, d);
                    const isWknd = isWeekend(dateObj);
                    return (
                      <th
                        key={d}
                        className={cn('border border-gray-200 py-1 w-9 min-w-[36px] text-center font-medium', isWknd ? 'bg-slate-50 text-slate-500' : 'text-gray-600')}
                      >
                        <div className="font-semibold">{d}</div>
                        <div className="text-[10px] opacity-70">{DAY_NAMES[getDay(dateObj)]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, ri) => (
                  <tr key={emp.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="sticky left-0 z-10 bg-inherit border border-gray-200 px-2 py-1.5 w-36 min-w-[140px]">
                      <div className="font-medium text-gray-800 truncate max-w-[130px]">{emp.full_name}</div>
                      {emp.pod_id && (
                        <div className="text-[10px] text-indigo-600 bg-indigo-50 rounded px-1 py-0.5 inline-block mt-0.5">
                          {pods.find(p => p.id === emp.pod_id)?.pod_name ?? 'Pod'}
                        </div>
                      )}
                    </td>
                    {days.map(d => {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const entry = entryMap.get(`${emp.id}:${dateStr}`);
                      const status = entry?.schedule_status ?? 'not_required';
                      const abbrev = STATUS_ABBREV[status] ?? '';
                      const isFiltered = filters.status && status !== filters.status;

                      return (
                        <td
                          key={d}
                          className={cn(
                            'border border-gray-200 w-9 h-8 text-center cursor-pointer select-none transition-opacity',
                            isFiltered && 'opacity-20',
                          )}
                          onClick={() => {
                            if (!period) return;
                            setSelectedCell(entry ?? {
                              roster_period_id: period.id,
                              employee_id: emp.id,
                              date: dateStr,
                              schedule_status: 'not_required',
                              employee: emp,
                            });
                          }}
                          title={`${emp.full_name} — ${dateStr}: ${STATUS_LABELS[status]}`}
                        >
                          <div className={cn('w-full h-full flex items-center justify-center rounded-sm font-semibold text-[10px] border', STATUS_COLORS[status])}>
                            {abbrev}
                            {entry?.is_manual_override && (
                              <span className="absolute top-0 right-0 w-1 h-1 bg-orange-400 rounded-full" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <FilterSidebar
        open={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
        pods={pods}
        brands={brands}
        filters={filters}
        setFilters={setFilters}
      />

      <GenerateModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        pods={pods}
        onGenerate={podId => generateRoster.mutate({ podId })}
        isLoading={generateRoster.isPending}
      />

      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        conflictCount={conflicts.length}
        onPublish={() => publishRoster.mutate()}
        isLoading={publishRoster.isPending}
      />

      <CellEditModal
        open={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        entry={selectedCell}
        brands={brands}
        processes={processes}
        onSave={updated => {
          if (!selectedCell || !period) return;
          saveCell.mutate({
            ...updated,
            roster_period_id: period.id,
            employee_id: selectedCell.employee_id,
            date: selectedCell.date,
          } as any);
        }}
      />
    </div>
  );
}
