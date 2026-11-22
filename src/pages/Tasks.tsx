import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, CheckSquare, Search, Filter, AlertTriangle, Clock,
  User, Edit2, Trash2, ChevronDown, X, Check, Eye,
  MessageSquare, Calendar, Tag, Flag, Building2
} from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

// ─── Supabase ────────────────────────────────────────────────────────────────


// ─── Types ───────────────────────────────────────────────────────────────────
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  assigned_to: string;
  assigned_by?: string | null;
  brand_id?: string | null;
  process_id?: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date?: string | null;
  start_date?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at?: string;
  assignee?: { id: string; full_name: string } | null;
  assigner?: { id: string; full_name: string } | null;
  brand?: { id: string; brand_name: string } | null;
  process?: { id: string; name: string } | null;
}

interface Employee { id: string; full_name: string }
interface Brand { id: string; brand_name: string }
interface Process { id: string; name: string }

// ─── Constants ───────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_COLORS: Record<TaskStatus | 'overdue', string> = {
  assigned: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

type TabKey = 'all' | 'my' | 'overdue' | 'priority';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Tasks' },
  { key: 'my', label: 'My Tasks' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'priority', label: 'By Priority' },
];

function isOverdue(task: Task) {
  return task.due_date && !['completed', 'cancelled'].includes(task.status) && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
}

// ─── Toast ───────────────────────────────────────────────────────────────────
interface ToastMsg { id: string; type: 'success' | 'error'; title: string; message?: string }

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
  };
}

function ToastContainer({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cn('flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[280px] border', t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800')}>
          <div className="flex-1"><p className="font-medium text-sm">{t.title}</p>{t.message && <p className="text-xs opacity-80">{t.message}</p>}</div>
          <button onClick={() => dismiss(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Task Form ────────────────────────────────────────────────────────────────
interface TaskFormState {
  title: string; description: string; assigned_to: string;
  brand_id: string; process_id: string; priority: Priority;
  due_date: string; start_date: string; status: TaskStatus;
  completion_notes: string;
}

const defaultForm: TaskFormState = {
  title: '', description: '', assigned_to: '', brand_id: '', process_id: '',
  priority: 'medium', due_date: '', start_date: '', status: 'assigned', completion_notes: '',
};

function TaskForm({
  form, setForm, employees, brands, processes, showStatus = false,
}: {
  form: TaskFormState; setForm: (f: TaskFormState) => void;
  employees: Employee[]; brands: Brand[]; processes: Process[]; showStatus?: boolean;
}) {
  const field = (key: keyof TaskFormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
        <input {...field('title')} placeholder="Task title..." className={inp} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea {...field('description')} rows={3} placeholder="Details..." className={inp + ' resize-none'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To <span className="text-red-500">*</span></label>
          <select {...field('assigned_to')} className={inp}>
            <option value="">Select employee</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select {...field('priority')} className={inp}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
          <select {...field('brand_id')} className={inp}>
            <option value="">— None —</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Process</label>
          <select {...field('process_id')} className={inp}>
            <option value="">— None —</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" {...field('start_date')} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input type="date" {...field('due_date')} className={inp} />
        </div>
      </div>
      {showStatus && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...field('status')} className={inp}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {form.status === 'completed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
              <textarea {...field('completion_notes')} rows={2} placeholder="Notes on completion..." className={inp + ' resize-none'} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task, onClose, onEdit }: { task: Task | null; onClose: () => void; onEdit: (task: Task) => void }) {
  if (!task) return null;
  const overdue = isOverdue(task);
  const effectiveStatus = overdue ? 'overdue' : task.status;
  return (
    <Modal open={!!task} onClose={onClose} title="Task Details" footer={
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100">Close</button>
        <button onClick={() => { onEdit(task); onClose(); }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><Edit2 size={14} /> Edit</button>
      </div>
    }>
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 text-base">{task.title}</h3>
            <div className="flex gap-2 shrink-0">
              <span className={cn('text-xs px-2 py-1 rounded-full border font-medium', PRIORITY_COLORS[task.priority])}>{PRIORITY_LABELS[task.priority]}</span>
              <span className={cn('text-xs px-2 py-1 rounded-full border font-medium', STATUS_COLORS[effectiveStatus as keyof typeof STATUS_COLORS])}>{overdue ? 'Overdue' : STATUS_LABELS[task.status]}</span>
            </div>
          </div>
          {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
          <div><span className="text-gray-500 text-xs">Assigned To</span><p className="font-medium">{task.assignee?.full_name ?? '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Assigned By</span><p className="font-medium">{task.assigner?.full_name ?? '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Brand</span><p className="font-medium">{task.brand?.brand_name ?? '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Process</span><p className="font-medium">{task.process?.name ?? '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Start Date</span><p className="font-medium">{task.start_date ? format(parseISO(task.start_date), 'dd MMM yyyy') : '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Due Date</span><p className={cn('font-medium', overdue && 'text-red-600')}>{task.due_date ? format(parseISO(task.due_date), 'dd MMM yyyy') : '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Created</span><p className="font-medium">{format(parseISO(task.created_at), 'dd MMM yyyy')}</p></div>
        </div>
        {task.completion_notes && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-700 mb-1">Completion Notes</p>
            <p className="text-sm text-green-800">{task.completion_notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Priority Group ───────────────────────────────────────────────────────────
function PriorityGroup({ priority, tasks, onView, onEdit, onDelete }: {
  priority: Priority; tasks: Task[];
  onView: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (tasks.length === 0) return null;
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 w-full text-left mb-2 group">
        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full border', PRIORITY_COLORS[priority])}>{PRIORITY_LABELS[priority]}</span>
        <span className="text-xs text-gray-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <ChevronDown size={14} className={cn('ml-auto text-gray-400 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <TaskTable tasks={tasks} onView={onView} onEdit={onEdit} onDelete={onDelete} />}
    </div>
  );
}

// ─── Task Table ───────────────────────────────────────────────────────────────
function TaskTable({ tasks, onView, onEdit, onDelete }: {
  tasks: Task[]; onView: (t: Task) => void; onEdit: (t: Task) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Title</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Assigned To</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Brand</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Process</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Priority</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Due</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Created</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => {
            const overdue = isOverdue(task);
            const effectiveStatus = overdue ? 'overdue' : task.status;
            return (
              <tr key={task.id} className={cn('border-b border-gray-100 hover:bg-gray-50 transition-colors', i === tasks.length - 1 && 'border-b-0')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} className={cn('shrink-0', task.status === 'completed' ? 'text-green-500' : 'text-gray-400')} />
                    <span className={cn('font-medium text-gray-800', task.status === 'completed' && 'line-through text-gray-400')}>{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{task.assignee?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{task.brand?.brand_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{task.process?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PRIORITY_COLORS[task.priority])}>{PRIORITY_LABELS[task.priority]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[effectiveStatus as keyof typeof STATUS_COLORS])}>
                    {overdue ? 'Overdue' : STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {task.due_date ? (
                    <span className={cn('text-xs', overdue && 'text-red-600 font-medium')}>
                      {overdue && <AlertTriangle size={12} className="inline mr-1" />}
                      {format(parseISO(task.due_date), 'dd MMM yy')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">{format(parseISO(task.created_at), 'dd MMM yy')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onView(task)} title="View" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-600"><Eye size={14} /></button>
                    <button onClick={() => onEdit(task)} title="Edit" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-600"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(task.id)} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Tasks() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(defaultForm);

  // ── Data ──
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:employees!tasks_assigned_to_fkey(id, full_name), assigner:employees!tasks_assigned_by_fkey(id, full_name), brand:brands(id, brand_name), process:processes(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, full_name').eq('employment_status', 'active').order('full_name');
      return data ?? [];
    },
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('id, brand_name').eq('status', 'active').order('brand_name');
      return data ?? [];
    },
  });

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data } = await supabase.from('processes').select('id, name').eq('status', 'active').order('name');
      return data ?? [];
    },
  });

  // ── Filters ──
  const filtered = useMemo(() => {
    let list = tasks;
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.assignee?.full_name?.toLowerCase().includes(search.toLowerCase()));
    if (tab === 'overdue') list = list.filter(t => isOverdue(t));
    if (tab === 'my') {
      // In a real app, filter by current user's employee id
      list = list;
    }
    return list;
  }, [tasks, search, tab]);

  const byPriority = useMemo(() => {
    const order: Priority[] = ['urgent', 'high', 'medium', 'low'];
    return order.map(p => ({ priority: p, tasks: filtered.filter(t => t.priority === p) }));
  }, [filtered]);

  const counts = useMemo(() => ({
    all: tasks.length,
    my: tasks.length,
    overdue: tasks.filter(t => isOverdue(t)).length,
    priority: tasks.length,
  }), [tasks]);

  // ── Mutations ──
  const addTask = useMutation({
    mutationFn: async (f: TaskFormState) => {
      if (!f.title.trim() || !f.assigned_to) throw new Error('Title and assignee are required');
      // Get current user profile id for assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      const assignedBy = user?.id ?? f.assigned_to; // fallback to assignee if no auth
      const { data, error } = await supabase.from('tasks').insert({
        title: f.title.trim(),
        description: f.description || null,
        assigned_to: f.assigned_to,
        assigned_by: assignedBy,
        brand_id: f.brand_id || null,
        process_id: f.process_id || null,
        priority: f.priority,
        status: 'assigned',
        due_date: f.due_date || null,
        start_date: f.start_date || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task created'); setShowAdd(false); setForm(defaultForm); },
    onError: (e: any) => toast.error('Failed to create task', e.message),
  });

  const updateTask = useMutation({
    mutationFn: async (f: TaskFormState & { id: string }) => {
      const { error } = await supabase.from('tasks').update({
        title: f.title.trim(),
        description: f.description || null,
        assigned_to: f.assigned_to,
        brand_id: f.brand_id || null,
        process_id: f.process_id || null,
        priority: f.priority,
        status: f.status,
        due_date: f.due_date || null,
        start_date: f.start_date || null,
        completion_notes: f.status === 'completed' ? f.completion_notes || null : null,
        updated_at: new Date().toISOString(),
      }).eq('id', f.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task updated'); setEditTask(null); },
    onError: (e: any) => toast.error('Failed to update task', e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted'); },
    onError: (e: any) => toast.error('Failed to delete', e.message),
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tasks.length} total tasks</p>
          </div>
          <button
            onClick={() => { setForm(defaultForm); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 -mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5', tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              {t.label}
              {t.key === 'overdue' && counts.overdue > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{counts.overdue}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 bg-white border-b">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <CheckSquare size={40} className="mb-3" />
            <p className="font-medium">No tasks found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search' : tab === 'overdue' ? 'No overdue tasks!' : 'Create your first task'}</p>
          </div>
        ) : tab === 'priority' ? (
          <div>
            {byPriority.map(({ priority, tasks: pts }) => (
              <PriorityGroup key={priority} priority={priority} tasks={pts}
                onView={setViewTask} onEdit={t => { setEditTask(t); setForm({ title: t.title, description: t.description ?? '', assigned_to: t.assigned_to, brand_id: t.brand_id ?? '', process_id: t.process_id ?? '', priority: t.priority, due_date: t.due_date ?? '', start_date: t.start_date ?? '', status: t.status, completion_notes: t.completion_notes ?? '' }); }}
                onDelete={id => deleteTask.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <TaskTable
            tasks={filtered}
            onView={setViewTask}
            onEdit={t => { setEditTask(t); setForm({ title: t.title, description: t.description ?? '', assigned_to: t.assigned_to, brand_id: t.brand_id ?? '', process_id: t.process_id ?? '', priority: t.priority, due_date: t.due_date ?? '', start_date: t.start_date ?? '', status: t.status, completion_notes: t.completion_notes ?? '' }); }}
            onDelete={id => deleteTask.mutate(id)}
          />
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Task" footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => addTask.mutate(form)} disabled={addTask.isPending} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {addTask.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      }>
        <TaskForm form={form} setForm={setForm} employees={employees} brands={brands} processes={processes} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task" footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditTask(null)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => editTask && updateTask.mutate({ ...form, id: editTask.id })} disabled={updateTask.isPending} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {updateTask.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }>
        <TaskForm form={form} setForm={setForm} employees={employees} brands={brands} processes={processes} showStatus />
      </Modal>

      {/* Detail Modal */}
      <TaskDetailModal task={viewTask} onClose={() => setViewTask(null)} onEdit={t => { setEditTask(t); setForm({ title: t.title, description: t.description ?? '', assigned_to: t.assigned_to, brand_id: t.brand_id ?? '', process_id: t.process_id ?? '', priority: t.priority, due_date: t.due_date ?? '', start_date: t.start_date ?? '', status: t.status, completion_notes: t.completion_notes ?? '' }); }} />
    </div>
  );
}
