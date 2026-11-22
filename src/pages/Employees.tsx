import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, Filter, Edit, Trash2, Eye, Download,
  MoreVertical, ChevronUp, ChevronDown, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Modal, ConfirmDialog } from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { EmptyState } from '../components/shared/EmptyState';
import { SkeletonRow } from '../components/shared/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, getInitials, formatDate, getDayName } from '../lib/utils';
import type { Employee, Pod, Brand } from '../types/database';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const employeeSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  pod_id: z.string().optional(),
  role: z.enum(['admin', 'operations_manager', 'pod_lead', 'employee']),
  employment_status: z.enum(['active', 'inactive', 'on_leave', 'terminated']),
  weekly_off_day: z.coerce.number().min(0).max(6),
  joining_date: z.string().optional(),
  working_hours: z.coerce.number().optional(),
  skills: z.string().optional(),
  notes: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ROLES = ['admin', 'operations_manager', 'pod_lead', 'employee'] as const;
const STATUSES = ['active', 'inactive', 'on_leave', 'terminated'] as const;
const PAGE_SIZE = 20;

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-red-100 text-red-700',
};

const roleColor: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  operations_manager: 'bg-blue-100 text-blue-700',
  pod_lead: 'bg-indigo-100 text-indigo-700',
  employee: 'bg-slate-100 text-slate-600',
};

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={cn('rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-semibold text-white flex-shrink-0', sz)}>
      {getInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------
function SortIcon({ field, sort }: { field: string; sort: { field: string; dir: 'asc' | 'desc' } }) {
  if (sort.field !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />;
  return sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
}

// ---------------------------------------------------------------------------
// Employee Form
// ---------------------------------------------------------------------------
function EmployeeForm({
  defaultValues, onSubmit, pods, isLoading,
}: {
  defaultValues?: Partial<EmployeeFormData>;
  onSubmit: (data: EmployeeFormData) => void;
  pods: Pod[];
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'employee', employment_status: 'active', weekly_off_day: 0, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input {...register('full_name')} className={cn('input', errors.full_name && 'border-red-400')} placeholder="Jane Doe" />
          {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input {...register('email')} type="email" className={cn('input', errors.email && 'border-red-400')} placeholder="jane@example.com" />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input {...register('phone')} className="input" placeholder="+91 9876543210" />
        </div>
        <div className="form-group">
          <label className="form-label">Designation</label>
          <input {...register('designation')} className="input" placeholder="Senior Agent" />
        </div>
        <div className="form-group">
          <label className="form-label">Department</label>
          <input {...register('department')} className="input" placeholder="Operations" />
        </div>
        <div className="form-group">
          <label className="form-label">Pod</label>
          <select {...register('pod_id')} className="input">
            <option value="">No Pod</option>
            {pods.map((p: any) => <option key={p.id} value={p.id}>{p.pod_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select {...register('role')} className="input">
            {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Employment Status *</label>
          <select {...register('employment_status')} className="input">
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Weekly Off Day *</label>
          <select {...register('weekly_off_day')} className="input">
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Joining Date</label>
          <input {...register('joining_date')} type="date" className="input" />
        </div>
        <div className="form-group">
          <label className="form-label">Working Hours / Day</label>
          <input {...register('working_hours')} type="number" min={1} max={24} className="input" placeholder="8" />
        </div>
        <div className="form-group sm:col-span-2">
          <label className="form-label">Skills (comma-separated)</label>
          <input {...register('skills')} className="input" placeholder="Customer Service, Data Entry, Excel" />
        </div>
        <div className="form-group sm:col-span-2">
          <label className="form-label">Notes</label>
          <textarea {...register('notes')} className="input min-h-[80px]" placeholder="Additional notes..." />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Saving...' : 'Save Employee'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Employee Detail Modal
// ---------------------------------------------------------------------------
function EmployeeDetailModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const { data: leaveHistory } = useQuery({
    queryKey: ['emp-leaves', employee.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('start_date', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: taskHistory } = useQuery({
    queryKey: ['emp-tasks', employee.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('assigned_to', employee.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={employee.full_name} size="lg">
      <div className="space-y-6">
        {/* Basic info */}
        <div className="flex items-start gap-4">
          <Avatar name={employee.full_name} size="lg" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{employee.full_name}</p>
            <p className="text-sm text-slate-500">{employee.email}</p>
            {employee.phone && <p className="text-sm text-slate-500">{employee.phone}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('badge', statusColor[employee.employment_status])}>{employee.employment_status?.replace(/_/g, ' ')}</span>
              <span className={cn('badge', roleColor[employee.role])}>{employee.role?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-400">Employee ID</span><p className="font-medium">{employee.employee_id}</p></div>
          <div><span className="text-slate-400">Designation</span><p className="font-medium">{employee.designation || 'â€”'}</p></div>
          <div><span className="text-slate-400">Department</span><p className="font-medium">{employee.department || 'â€”'}</p></div>
          <div><span className="text-slate-400">Weekly Off</span><p className="font-medium">{DAYS[employee.weekly_off_day]}</p></div>
          <div><span className="text-slate-400">Joining Date</span><p className="font-medium">{employee.joining_date ? formatDate(employee.joining_date) : 'â€”'}</p></div>
          <div><span className="text-slate-400">Working Hours</span><p className="font-medium">{employee.working_hours ?? 'â€”'} h/day</p></div>
        </div>

        {employee.skills?.length > 0 && (
          <div>
            <p className="text-slate-400 text-sm mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((s: string) => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Leave History */}
        <div>
          <p className="font-semibold text-slate-700 mb-2">Leave History</p>
          {!leaveHistory?.length ? (
            <p className="text-sm text-slate-400">No leave records</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="pb-1">Type</th><th>Dates</th><th>Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {leaveHistory.map((l: any) => (
                  <tr key={l.id} className="py-1">
                    <td className="py-1.5 pr-4 capitalize">{l.leave_type}</td>
                    <td className="py-1.5 pr-4">{formatDate(l.start_date)} â€“ {formatDate(l.end_date)}</td>
                    <td><span className={cn('badge', { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }[l.status] ?? 'bg-slate-100')}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Task History */}
        <div>
          <p className="font-semibold text-slate-700 mb-2">Recent Tasks</p>
          {!taskHistory?.length ? (
            <p className="text-sm text-slate-400">No tasks assigned</p>
          ) : (
            <ul className="space-y-2">
              {taskHistory.map((t: any) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-slate-400">{t.due_date ? formatDate(t.due_date) : ''}</span>
                  <span className="badge bg-slate-100 text-slate-600">{t.status?.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function Employees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterPod, setFilterPod] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'full_name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [viewEmployee, setViewEmployee] = useState<any | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<any | null>(null);

  // ---- Pods for filter / form --------------------------------------------
  const { data: pods = [] } = useQuery({
    queryKey: ['pods-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pods').select('id, pod_name, pod_code').eq('status', 'active').order('pod_name');
      if (error) return [];
      return data ?? [];
    },
  });

  // ---- Employees -----------------------------------------------------------
  const { data: employeesData, isLoading, error: empError } = useQuery({
    queryKey: ['employees', search, filterPod, filterRole, filterStatus, sort, page],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('*, pods:pod_id(pod_name, pod_code)', { count: 'exact' });

      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,designation.ilike.%${search}%,employee_id.ilike.%${search}%`);
      if (filterPod) query = query.eq('pod_id', filterPod);
      if (filterRole) query = query.eq('role', filterRole);
      if (filterStatus) query = query.eq('employment_status', filterStatus);

      query = query.order(sort.field, { ascending: sort.dir === 'asc' });
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error('Employees query error:', error);
        return { employees: [], total: 0 };
      }
      return { employees: data ?? [], total: count ?? 0 };
    },
    staleTime: 1000 * 30,
  });

  const employees = employeesData?.employees ?? [];
  const total = employeesData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---- Mutations -----------------------------------------------------------
  const addEmployee = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const employee_id = `EMP${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from('employees').insert({
        ...data,
        employee_id,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        pod_id: data.pod_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ type: 'success', message: 'Employee added successfully' });
      setShowAddModal(false);
    },
    onError: (err: any) => toast({ type: 'error', message: err.message ?? 'Failed to add employee' }),
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeFormData }) => {
      const { error } = await supabase.from('employees').update({
        ...data,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        pod_id: data.pod_id || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ type: 'success', message: 'Employee updated successfully' });
      setEditEmployee(null);
    },
    onError: (err: any) => toast({ type: 'error', message: err.message ?? 'Failed to update employee' }),
  });

  const deactivateEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').update({ employment_status: 'terminated' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ type: 'success', message: 'Employee deactivated' });
      setDeleteEmployee(null);
    },
    onError: (err: any) => toast({ type: 'error', message: err.message ?? 'Failed to deactivate' }),
  });

  // ---- Sort toggle ---------------------------------------------------------
  const toggleSort = (field: string) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  // ---- CSV Export ----------------------------------------------------------
  const handleExport = () => {
    if (!employees.length) return;
    const header = 'Name,Email,Employee ID,Designation,Pod,Role,Status,Weekly Off\n';
    const rows = employees.map(e =>
      [e.full_name, e.email, e.employee_id, e.designation, (e as any).pods?.name ?? '', e.role, e.employment_status, DAYS[e.weekly_off_day]].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click();
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500">{total} total employees</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9" placeholder="Search by name, email, ID..."
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <select value={filterPod} onChange={e => { setFilterPod(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Pods</option>
          {pods.map((p: any) => <option key={p.id} value={p.id}>{p.pod_name}</option>)}
        </select>
        <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {(search || filterPod || filterRole || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterPod(''); setFilterRole(''); setFilterStatus(''); setPage(1); }} className="text-sm text-slate-500 hover:text-slate-700">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="th cursor-pointer select-none" onClick={() => toggleSort('full_name')}>
                  <div className="flex items-center gap-1">Name <SortIcon field="full_name" sort={sort} /></div>
                </th>
                <th className="th">Employee ID</th>
                <th className="th cursor-pointer select-none" onClick={() => toggleSort('email')}>
                  <div className="flex items-center gap-1">Email <SortIcon field="email" sort={sort} /></div>
                </th>
                <th className="th">Designation</th>
                <th className="th">Pod</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Weekly Off</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16">
                    <EmptyState
                      title="No employees found"
                      description={search ? `No results for "${search}"` : 'Add your first employee to get started'}
                      action={!search ? <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">Add Employee</button> : undefined}
                    />
                  </td>
                </tr>
              ) : (
                employees.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.full_name} size="sm" />
                        <span className="font-medium text-slate-800">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="td font-mono text-xs text-slate-500">{emp.employee_id}</td>
                    <td className="td text-slate-500">{emp.email}</td>
                    <td className="td text-slate-600">{emp.designation || 'â€”'}</td>
                    <td className="td">
                      {emp.pods ? (
                        <span className="badge bg-cyan-100 text-cyan-700">{emp.pods.pod_name}</span>
                      ) : <span className="text-slate-300">â€”</span>}
                    </td>
                    <td className="td">
                      <span className={cn('badge', roleColor[emp.role])}>{emp.role?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="td">
                      <span className={cn('badge', statusColor[emp.employment_status])}>{emp.employment_status?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="td text-slate-500">{DAYS[emp.weekly_off_day]}</td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewEmployee(emp)} className="icon-btn" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditEmployee(emp)} className="icon-btn" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteEmployee(emp)} className="icon-btn text-red-400 hover:text-red-600 hover:bg-red-50" title="Deactivate">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}â€“{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="icon-btn disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-300 px-1">â€¦</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={cn('w-7 h-7 rounded text-xs font-medium', p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-600')}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="icon-btn disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="Add Employee" size="lg">
          <EmployeeForm
            pods={pods}
            isLoading={addEmployee.isPending}
            onSubmit={(data) => addEmployee.mutate(data)}
          />
        </Modal>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <Modal isOpen={true} onClose={() => setEditEmployee(null)} title="Edit Employee" size="lg">
          <EmployeeForm
            pods={pods}
            isLoading={updateEmployee.isPending}
            defaultValues={{
              ...editEmployee,
              skills: Array.isArray(editEmployee.skills) ? editEmployee.skills.join(', ') : editEmployee.skills,
              pod_id: editEmployee.pod_id ?? '',
            }}
            onSubmit={(data) => updateEmployee.mutate({ id: editEmployee.id, data })}
          />
        </Modal>
      )}

      {/* View Employee Modal */}
      {viewEmployee && (
        <EmployeeDetailModal employee={viewEmployee} onClose={() => setViewEmployee(null)} />
      )}

      {/* Delete Confirm */}
      {deleteEmployee && (
        <ConfirmDialog isOpen={true} title="Deactivate Employee"
          message={`Are you sure you want to deactivate ${deleteEmployee.full_name}? Their status will be set to "Terminated".`}
          confirmLabel="Deactivate"
          confirmClass="btn-danger"
          onConfirm={() => deactivateEmployee.mutate(deleteEmployee.id)}
          onClose={() => setDeleteEmployee(null)}
          loading={deactivateEmployee.isPending}
        />
      )}
    </div>
  );
}
