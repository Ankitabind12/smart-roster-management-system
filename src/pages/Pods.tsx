import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, Edit2, Trash2, Users, Tag, ChevronRight,
  Building2, Settings2, Eye
} from 'lucide-react';
import { Modal, ConfirmDialog } from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { EmptyState } from '../components/shared/EmptyState';
import { SkeletonRow } from '../components/shared/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, capitalizeFirst } from '../lib/utils';
import type { Pod, Employee } from '../types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const podSchema = z.object({
  pod_name: z.string().min(2, 'Pod name must be at least 2 characters'),
  pod_code: z.string().min(1, 'Pod code is required').max(10),
  description: z.string().optional(),
  pod_lead_id: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});
type PodFormData = z.infer<typeof podSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────
function usePods() {
  return useQuery({
    queryKey: ['pods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pods')
        .select(`
          *,
          pod_lead:employees!pods_pod_lead_id_fkey(id, full_name, designation)
        `)
        .order('pod_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useEmployees() {
  return useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, designation, employment_status, pod_id, role')
        .eq('employment_status', 'active')
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pod Form
// ─────────────────────────────────────────────────────────────────────────────
function PodForm({
  defaultValues,
  employees,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<PodFormData>;
  employees: Employee[];
  onSubmit: (data: PodFormData) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<PodFormData>({
    resolver: zodResolver(podSchema),
    defaultValues: { status: 'active', ...defaultValues },
  });

  const podLeads = employees.filter(e =>
    ['pod_lead', 'operations_manager', 'admin'].includes(e.role)
  );

  return (
    <form id="pod-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pod Name *</label>
          <input {...register('pod_name')} className="input-field" placeholder="e.g. Alpha Squad" />
          {errors.pod_name && <p className="text-xs text-red-600 mt-1">{errors.pod_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pod Code *</label>
          <input {...register('pod_code')} className="input-field" placeholder="e.g. ALPHA" />
          {errors.pod_code && <p className="text-xs text-red-600 mt-1">{errors.pod_code.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea {...register('description')} rows={2} className="input-field resize-none" placeholder="Brief description..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pod Lead</label>
          <select {...register('pod_lead_id')} className="select-field">
            <option value="">No Pod Lead Assigned</option>
            {podLeads.map(e => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.designation ?? e.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select {...register('status')} className="select-field">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pod Card
// ─────────────────────────────────────────────────────────────────────────────
function PodCard({
  pod,
  members,
  onEdit,
  onDelete,
  onViewDetail,
}: {
  pod: any;
  members: Employee[];
  onEdit: (pod: any) => void;
  onDelete: (pod: any) => void;
  onViewDetail: (pod: any) => void;
}) {
  const podMembers = members.filter(e => e.pod_id === pod.id);
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold text-sm">
            {pod.pod_code?.slice(0, 2) ?? 'PD'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{pod.pod_name}</h3>
            <p className="text-xs text-slate-500">{pod.pod_code}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onViewDetail(pod)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(pod)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(pod)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {pod.description && (
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{pod.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Pod Lead</p>
          <p className="text-sm font-medium text-slate-800">
            {pod.pod_lead?.full_name ?? <span className="text-slate-400 italic">Unassigned</span>}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Members</p>
          <p className="text-sm font-medium text-slate-800">{podMembers.length}</p>
        </div>
      </div>

      {/* Member avatars */}
      {podMembers.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {podMembers.slice(0, 6).map(m => (
            <div
              key={m.id}
              title={m.full_name}
              className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center border border-white"
            >
              {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          ))}
          {podMembers.length > 6 && (
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center border border-white">
              +{podMembers.length - 6}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100">
        <span className={cn(
          'badge text-xs',
          pod.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        )}>
          {capitalizeFirst(pod.status ?? 'active')}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────
function PodDetailModal({ pod, members, onClose }: { pod: any; members: Employee[]; onClose: () => void }) {
  const podMembers = members.filter(e => e.pod_id === pod.id);
  return (
    <Modal isOpen={!!pod} onClose={onClose} title={`${pod.pod_name} — Details`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary-700">{podMembers.length}</p>
            <p className="text-xs text-primary-500 mt-0.5">Total Members</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {podMembers.filter(m => m.employment_status === 'active').length}
            </p>
            <p className="text-xs text-green-500 mt-0.5">Active</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-slate-700">{pod.pod_code}</p>
            <p className="text-xs text-slate-500 mt-0.5">Pod Code</p>
          </div>
        </div>

        {pod.pod_lead && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Pod Lead</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center">
                {pod.pod_lead.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{pod.pod_lead.full_name}</p>
                <p className="text-xs text-slate-500">{pod.pod_lead.designation}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Members ({podMembers.length})</h3>
          {podMembers.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-4">No members assigned to this pod</p>
          ) : (
            <div className="space-y-2">
              {podMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center">
                      {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.full_name}</p>
                      <p className="text-xs text-slate-500">{m.designation ?? capitalizeFirst(m.role)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'badge text-xs',
                    m.employment_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {capitalizeFirst(m.employment_status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function PodsPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: pods = [], isLoading } = usePods();
  const { data: employees = [] } = useEmployees();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editPod, setEditPod] = useState<any | null>(null);
  const [deletePod, setDeletePod] = useState<any | null>(null);
  const [detailPod, setDetailPod] = useState<any | null>(null);

  const filtered = pods.filter((p: any) =>
    p.pod_name.toLowerCase().includes(search.toLowerCase()) ||
    p.pod_code.toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: async (data: PodFormData) => {
      const { error } = await supabase.from('pods').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pods'] });
      toast.success('Pod created successfully');
      setShowAdd(false);
    },
    onError: (err: any) => toast.error('Failed to create pod', err.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...data }: PodFormData & { id: string }) => {
      const { error } = await supabase.from('pods').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pods'] });
      toast.success('Pod updated successfully');
      setEditPod(null);
    },
    onError: (err: any) => toast.error('Failed to update pod', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pods'] });
      toast.success('Pod deleted');
      setDeletePod(null);
    },
    onError: (err: any) => toast.error('Failed to delete pod', err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pods & Teams</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage operational pods and their members</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Pod
        </button>
      </div>

      {/* Search + Stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9" placeholder="Search pods..." />
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
          <span><strong className="text-slate-900">{pods.length}</strong> pods</span>
          <span><strong className="text-slate-900">{employees.length}</strong> members</span>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div className="flex-1"><div className="h-4 bg-slate-200 rounded mb-1 w-3/4" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
              </div>
              <div className="h-3 bg-slate-100 rounded mb-3" /><div className="h-3 bg-slate-100 rounded w-3/4 mb-4" />
              <div className="grid grid-cols-2 gap-2"><div className="h-14 bg-slate-100 rounded-lg" /><div className="h-14 bg-slate-100 rounded-lg" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No pods found"
          description={search ? 'No pods match your search.' : 'Create your first operational pod to get started.'}
          action={!search ? <button onClick={() => setShowAdd(true)} className="btn-primary">Add Pod</button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((pod: any) => (
            <PodCard
              key={pod.id}
              pod={pod}
              members={employees as Employee[]}
              onEdit={setEditPod}
              onDelete={setDeletePod}
              onViewDetail={setDetailPod}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Pod" size="md"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button form="pod-form" type="submit" className="btn-primary" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Creating...' : 'Create Pod'}
            </button>
          </>
        }>
        <PodForm employees={employees as Employee[]} onSubmit={addMutation.mutate} loading={addMutation.isPending} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editPod} onClose={() => setEditPod(null)} title="Edit Pod" size="md"
        footer={
          <>
            <button onClick={() => setEditPod(null)} className="btn-secondary">Cancel</button>
            <button form="pod-form" type="submit" className="btn-primary" disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }>
        {editPod && (
          <PodForm
            employees={employees as Employee[]}
            defaultValues={editPod}
            onSubmit={data => editMutation.mutate({ id: editPod.id, ...data })}
            loading={editMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletePod}
        onClose={() => setDeletePod(null)}
        onConfirm={() => deleteMutation.mutate(deletePod!.id)}
        title="Delete Pod"
        message={`Are you sure you want to delete "${deletePod?.pod_name}"? This action cannot be undone.`}
        confirmLabel="Delete Pod"
        loading={deleteMutation.isPending}
      />

      {/* Detail Modal */}
      {detailPod && (
        <PodDetailModal
          pod={detailPod}
          members={employees as Employee[]}
          onClose={() => setDetailPod(null)}
        />
      )}
    </div>
  );
}

// Need the import for GitBranch used in EmptyState
import { GitBranch } from 'lucide-react';
