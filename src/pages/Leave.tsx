import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, Filter, Check, X, Clock, Calendar,
  ChevronDown, AlertCircle, Eye
} from 'lucide-react';
import { Modal, ConfirmDialog } from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { EmptyState } from '../components/shared/EmptyState';
import { SkeletonRow } from '../components/shared/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, formatDate, getLeaveDays, LEAVE_STATUS_COLORS, capitalizeFirst } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import type { LeaveRequest, Employee } from '../types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────
const leaveSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  leave_type: z.enum(['casual', 'sick', 'earned', 'unpaid', 'other']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().min(5, 'Please provide a reason (minimum 5 characters)'),
});
type LeaveFormData = z.infer<typeof leaveSchema>;

const reviewSchema = z.object({
  review_notes: z.string().optional(),
});
type ReviewFormData = z.infer<typeof reviewSchema>;

type TabKey = 'all' | 'pending' | 'approved' | 'rejected';

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={cn('badge', colors[status] ?? 'bg-slate-100 text-slate-600')}>
      {capitalizeFirst(status)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leave Form
// ─────────────────────────────────────────────────────────────────────────────
function LeaveForm({
  employees,
  defaultEmployeeId,
  onSubmit,
  loading,
}: {
  employees: Employee[];
  defaultEmployeeId?: string;
  onSubmit: (data: LeaveFormData) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { employee_id: defaultEmployeeId ?? '', leave_type: 'casual' },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const days = startDate && endDate ? getLeaveDays(startDate, endDate) : 0;

  return (
    <form id="leave-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
        <select {...register('employee_id')} className="select-field">
          <option value="">Select employee...</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
          ))}
        </select>
        {errors.employee_id && <p className="text-xs text-red-600 mt-1">{errors.employee_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
        <select {...register('leave_type')} className="select-field">
          <option value="casual">Casual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="earned">Earned Leave</option>
          <option value="unpaid">Unpaid Leave</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
          <input type="date" {...register('start_date')} className="input-field" />
          {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
          <input type="date" {...register('end_date')} className="input-field" />
          {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date.message}</p>}
        </div>
      </div>

      {days > 0 && (
        <div className="bg-primary-50 text-primary-700 text-sm px-3 py-2 rounded-lg">
          Duration: <strong>{days} day{days !== 1 ? 's' : ''}</strong>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
        <textarea {...register('reason')} rows={3} className="input-field resize-none"
          placeholder="Please provide a reason for the leave request..." />
        {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Modal
// ─────────────────────────────────────────────────────────────────────────────
function ReviewModal({
  request,
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  request: any;
  onClose: () => void;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  loading?: boolean;
}) {
  const [notes, setNotes] = useState('');
  const days = getLeaveDays(request.start_date, request.end_date);

  return (
    <Modal isOpen={!!request} onClose={onClose} title="Review Leave Request" size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onReject(notes)} className="btn-danger" disabled={loading}>
            <X className="w-4 h-4" /> Reject
          </button>
          <button onClick={() => onApprove(notes)} className="btn-primary bg-green-600 hover:bg-green-700" disabled={loading}>
            <Check className="w-4 h-4" /> Approve
          </button>
        </>
      }>
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Employee</span><p className="font-medium text-slate-900">{request.employee?.full_name}</p></div>
            <div><span className="text-slate-500">Leave Type</span><p className="font-medium text-slate-900">{capitalizeFirst(request.leave_type)}</p></div>
            <div><span className="text-slate-500">From</span><p className="font-medium text-slate-900">{formatDate(request.start_date)}</p></div>
            <div><span className="text-slate-500">To</span><p className="font-medium text-slate-900">{formatDate(request.end_date)}</p></div>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 text-sm">Duration: </span>
            <span className="font-semibold text-slate-900">{days} day{days !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Reason</p>
          <p className="text-sm text-slate-600 bg-amber-50 p-3 rounded-lg">{request.reason}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Review Notes (optional)</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={2} className="input-field resize-none"
            placeholder="Add any notes for the employee..." />
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function LeavePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user, isManager } = useAuthStore();

  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<any | null>(null);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leave-requests', tab],
    queryFn: async () => {
      let q = supabase
        .from('leave_requests')
        .select(`*, employee:employees(id, full_name, employee_id, pod_id, designation)`)
        .order('submitted_at', { ascending: false });
      if (tab !== 'all') q = q.eq('status', tab);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees').select('id, full_name, employee_id, employment_status')
        .eq('employment_status', 'active').order('full_name');
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: LeaveFormData) => {
      const { error } = await supabase.from('leave_requests').insert({
        ...data,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request submitted');
      setShowAdd(false);
    },
    onError: (err: any) => toast.error('Failed to submit request', err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes: string }) => {
      const { error } = await supabase.from('leave_requests').update({
        status,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success(`Leave request ${vars.status}`);
      setReviewRequest(null);
    },
    onError: (err: any) => toast.error('Failed to update request', err.message),
  });

  const filtered = leaves.filter((l: any) =>
    l.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.leave_type?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: `All (${leaves.length})` },
    { key: 'pending', label: `Pending` },
    { key: 'approved', label: `Approved` },
    { key: 'rejected', label: `Rejected` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and manage employee leave requests</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['pending','approved','rejected','cancelled'] as const).map(s => {
          const count = leaves.filter((l: any) => l.status === s).length;
          const colors: Record<string, string> = {
            pending: 'bg-amber-50 text-amber-700 border-amber-100',
            approved: 'bg-green-50 text-green-700 border-green-100',
            rejected: 'bg-red-50 text-red-700 border-red-100',
            cancelled: 'bg-slate-50 text-slate-600 border-slate-100',
          };
          return (
            <div key={s} className={cn('rounded-xl border p-4 text-center', colors[s])}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5">{capitalizeFirst(s)}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn('px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                  tab === t.key ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100')}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 w-56" placeholder="Search employee..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="table-th">Employee</th>
                <th className="table-th">Leave Type</th>
                <th className="table-th">From</th>
                <th className="table-th">To</th>
                <th className="table-th">Days</th>
                <th className="table-th">Status</th>
                <th className="table-th">Submitted</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                filtered.map((leave: any) => (
                  <tr key={leave.id} className="table-tr">
                    <td className="table-td">
                      <div>
                        <p className="font-medium text-slate-900">{leave.employee?.full_name}</p>
                        <p className="text-xs text-slate-400">{leave.employee?.designation}</p>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="badge bg-slate-100 text-slate-700">
                        {capitalizeFirst(leave.leave_type)}
                      </span>
                    </td>
                    <td className="table-td text-slate-600">{formatDate(leave.start_date, 'MMM d, yyyy')}</td>
                    <td className="table-td text-slate-600">{formatDate(leave.end_date, 'MMM d, yyyy')}</td>
                    <td className="table-td">
                      <span className="font-medium text-slate-900">
                        {getLeaveDays(leave.start_date, leave.end_date)}
                      </span>
                    </td>
                    <td className="table-td"><StatusBadge status={leave.status} /></td>
                    <td className="table-td text-slate-500 text-xs">{formatDate(leave.submitted_at)}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        {isManager() && leave.status === 'pending' && (
                          <button
                            onClick={() => setReviewRequest(leave)}
                            className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 font-medium">
                            Review
                          </button>
                        )}
                        {leave.review_notes && (
                          <button title={leave.review_notes} className="p-1 text-slate-400 hover:text-slate-600">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Submit Leave Request" size="md"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button form="leave-form" type="submit" className="btn-primary" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </>
        }>
        <LeaveForm
          employees={employees as Employee[]}
          onSubmit={addMutation.mutate}
          loading={addMutation.isPending}
        />
      </Modal>

      {/* Review Modal */}
      {reviewRequest && (
        <ReviewModal
          request={reviewRequest}
          onClose={() => setReviewRequest(null)}
          onApprove={(notes) => reviewMutation.mutate({ id: reviewRequest.id, status: 'approved', notes })}
          onReject={(notes) => reviewMutation.mutate({ id: reviewRequest.id, status: 'rejected', notes })}
          loading={reviewMutation.isPending}
        />
      )}
    </div>
  );
}
