import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, X, Tag, GitBranch } from 'lucide-react';
import { Modal, ConfirmDialog } from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { EmptyState } from '../components/shared/EmptyState';
import { SkeletonRow } from '../components/shared/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../lib/utils';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const brandSchema = z.object({
  name: z.string().min(2, 'Name required'),
  code: z.string().min(1, 'Code required').max(10),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  operates_365: z.boolean().default(false),
  operates_on_sundays: z.boolean().default(false),
  operates_on_holidays: z.boolean().default(false),
  min_daily_staff: z.coerce.number().min(0).default(0),
});
type BrandFormData = z.infer<typeof brandSchema>;

const processSchema = z.object({
  name: z.string().min(2, 'Name required'),
  code: z.string().min(1, 'Code required').max(10),
  description: z.string().optional(),
  brand_id: z.string().min(1, 'Brand required'),
  process_type: z.enum(['cs', 'acc', 'ndr', 'retention', 'order_management', 'other']),
  min_daily_staff: z.coerce.number().min(0).default(0),
  operates_on_sundays: z.boolean().default(false),
  operates_on_holidays: z.boolean().default(false),
  status: z.enum(['active', 'inactive']),
});
type ProcessFormData = z.infer<typeof processSchema>;

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={cn('w-10 h-5 rounded-full transition-colors relative', checked ? 'bg-blue-500' : 'bg-slate-300')}
      >
        <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Brand Card
// ---------------------------------------------------------------------------
function BrandCard({ brand, processCount, onEdit, onDelete }: {
  brand: any; processCount: number; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={cn('card border-l-4 hover:shadow-md transition-shadow', brand.status === 'active' ? 'border-l-blue-500' : 'border-l-slate-300')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{brand.name}</h3>
          <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{brand.code}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="icon-btn"><Edit className="w-4 h-4" /></button>
          <button onClick={onDelete} className="icon-btn text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {brand.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{brand.description}</p>}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={cn('badge', brand.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{brand.status}</span>
        {brand.operates_365 && <span className="badge bg-blue-100 text-blue-600">365 Days</span>}
        {brand.operates_on_sundays && <span className="badge bg-purple-100 text-purple-600">Sundays</span>}
        {brand.operates_on_holidays && <span className="badge bg-orange-100 text-orange-600">Holidays</span>}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2 mt-auto">
        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {processCount} processes</span>
        {brand.min_daily_staff > 0 && <span>Min staff: {brand.min_daily_staff}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand Form
// ---------------------------------------------------------------------------
function BrandForm({ defaultValues, onSubmit, isLoading }: {
  defaultValues?: Partial<BrandFormData>; onSubmit: (d: BrandFormData) => void; isLoading: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: { status: 'active', operates_365: false, operates_on_sundays: false, operates_on_holidays: false, min_daily_staff: 0, ...defaultValues },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">Brand Name *</label>
          <input {...register('name')} className={cn('input', errors.name && 'border-red-400')} placeholder="Acme Corp" />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Brand Code *</label>
          <input {...register('code')} className={cn('input uppercase', errors.code && 'border-red-400')} placeholder="ACME" />
          {errors.code && <p className="form-error">{errors.code.message}</p>}
        </div>
        <div className="form-group sm:col-span-2">
          <label className="form-label">Description</label>
          <textarea {...register('description')} className="input min-h-[80px]" placeholder="Brand description..." />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select {...register('status')} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Min Daily Staff</label>
          <input {...register('min_daily_staff')} type="number" min={0} className="input" />
        </div>
        <div className="sm:col-span-2 space-y-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operational Rules</p>
          <Toggle checked={watch('operates_365')} onChange={v => setValue('operates_365', v)} label="Operates 365 days a year" />
          <Toggle checked={watch('operates_on_sundays')} onChange={v => setValue('operates_on_sundays', v)} label="Operates on Sundays" />
          <Toggle checked={watch('operates_on_holidays')} onChange={v => setValue('operates_on_holidays', v)} label="Operates on holidays" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Saving...' : 'Save Brand'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Process Form
// ---------------------------------------------------------------------------
const PROCESS_TYPES = ['cs', 'acc', 'ndr', 'retention', 'order_management', 'other'] as const;

function ProcessForm({ defaultValues, onSubmit, isLoading, brands }: {
  defaultValues?: Partial<ProcessFormData>; onSubmit: (d: ProcessFormData) => void; isLoading: boolean; brands: any[];
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProcessFormData>({
    resolver: zodResolver(processSchema),
    defaultValues: { status: 'active', process_type: 'cs', operates_on_sundays: false, operates_on_holidays: false, min_daily_staff: 0, ...defaultValues },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">Process Name *</label>
          <input {...register('name')} className={cn('input', errors.name && 'border-red-400')} placeholder="Customer Support" />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Process Code *</label>
          <input {...register('code')} className={cn('input uppercase', errors.code && 'border-red-400')} placeholder="CS01" />
          {errors.code && <p className="form-error">{errors.code.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Brand *</label>
          <select {...register('brand_id')} className={cn('input', errors.brand_id && 'border-red-400')}>
            <option value="">Select Brand...</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {errors.brand_id && <p className="form-error">{errors.brand_id.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Process Type *</label>
          <select {...register('process_type')} className="input">
            {PROCESS_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>
        </div>
        <div className="form-group sm:col-span-2">
          <label className="form-label">Description</label>
          <textarea {...register('description')} className="input min-h-[80px]" placeholder="Process description..." />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select {...register('status')} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Min Daily Staff</label>
          <input {...register('min_daily_staff')} type="number" min={0} className="input" />
        </div>
        <div className="sm:col-span-2 space-y-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operational Rules</p>
          <Toggle checked={watch('operates_on_sundays')} onChange={v => setValue('operates_on_sundays', v)} label="Operates on Sundays" />
          <Toggle checked={watch('operates_on_holidays')} onChange={v => setValue('operates_on_holidays', v)} label="Operates on holidays" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Saving...' : 'Save Process'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function Brands() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'brands' | 'processes'>('brands');
  const [search, setSearch] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editBrand, setEditBrand] = useState<any | null>(null);
  const [deleteBrand, setDeleteBrand] = useState<any | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [editProcess, setEditProcess] = useState<any | null>(null);
  const [deleteProcess, setDeleteProcess] = useState<any | null>(null);

  // ---- Brands --------------------------------------------------------------
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands', search],
    queryFn: async () => {
      let q = supabase.from('brands').select('*').order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      const { data } = await q; return data ?? [];
    },
  });

  // ---- Processes -----------------------------------------------------------
  const { data: processes = [], isLoading: processesLoading } = useQuery({
    queryKey: ['processes', search],
    queryFn: async () => {
      let q = supabase.from('processes').select('*, brands:brand_id(name, code)').order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      const { data } = await q; return data ?? [];
    },
  });

  // ---- Process counts per brand -------------------------------------------
  const processCounts: Record<string, number> = {};
  processes.forEach((p: any) => { processCounts[p.brand_id] = (processCounts[p.brand_id] ?? 0) + 1; });

  // ---- Mutations -----------------------------------------------------------
  const addBrand = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const { error } = await supabase.from('brands').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brands'] }); toast({ type: 'success', message: 'Brand added' }); setShowBrandModal(false); },
    onError: (e: any) => toast({ type: 'error', message: e.message }),
  });

  const updateBrand = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BrandFormData }) => {
      const { error } = await supabase.from('brands').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brands'] }); toast({ type: 'success', message: 'Brand updated' }); setEditBrand(null); },
    onError: (e: any) => toast({ type: 'error', message: e.message }),
  });

  const deleteBrandMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('brands').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brands'] }); toast({ type: 'success', message: 'Brand deleted' }); setDeleteBrand(null); },
    onError: (e: any) => toast({ type: 'error', message: e.message }),
  });

  const addProcess = useMutation({
    mutationFn: async (data: ProcessFormData) => { const { error } = await supabase.from('processes').insert(data); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ type: 'success', message: 'Process added' }); setShowProcessModal(false); },
    onError: (e: any) => toast({ type: 'error', message: e.message }),
  });

  const updateProcess = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProcessFormData }) => { const { error } = await supabase.from('processes').update(data).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ type: 'success', message: 'Process updated' }); setEditProcess(null); },
    onError: (e: any) => toast({ type: 'error', message: e.message }),
  });

  const deleteProcessMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('processes').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ type: 'success', message: 'Process deleted' }); setDeleteProcess(null); },
    onError: (e: any) => toast({ type: 'error', message: e.message }),
  });

  const processTypeColor: Record<string, string> = {
    cs: 'bg-blue-100 text-blue-700', acc: 'bg-purple-100 text-purple-700',
    ndr: 'bg-orange-100 text-orange-700', retention: 'bg-green-100 text-green-700',
    order_management: 'bg-cyan-100 text-cyan-700', other: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brands & Processes</h1>
          <p className="text-sm text-slate-500">{brands.length} brands · {processes.length} processes</p>
        </div>
        <button
          onClick={() => tab === 'brands' ? setShowBrandModal(true) : setShowProcessModal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add {tab === 'brands' ? 'Brand' : 'Process'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => setTab('brands')} className={cn('tab-btn', tab === 'brands' && 'tab-btn-active')}>
          <Tag className="w-4 h-4" /> Brands
        </button>
        <button onClick={() => setTab('processes')} className={cn('tab-btn', tab === 'processes' && 'tab-btn-active')}>
          <GitBranch className="w-4 h-4" /> Processes
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder={`Search ${tab}...`} />
        {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
      </div>

      {/* Brands Tab */}
      {tab === 'brands' && (
        brandsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse h-40 bg-slate-100" />)}
          </div>
        ) : brands.length === 0 ? (
          <EmptyState title="No brands yet" description="Add your first brand to get started" action={{ label: 'Add Brand', onClick: () => setShowBrandModal(true) }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((b: any) => (
              <BrandCard
                key={b.id} brand={b}
                processCount={processCounts[b.id] ?? 0}
                onEdit={() => setEditBrand(b)}
                onDelete={() => setDeleteBrand(b)}
              />
            ))}
          </div>
        )
      )}

      {/* Processes Tab */}
      {tab === 'processes' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Code</th>
                  <th className="th">Brand</th>
                  <th className="th">Type</th>
                  <th className="th">Min Staff</th>
                  <th className="th">Ops Rules</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                ) : processes.length === 0 ? (
                  <tr><td colSpan={8} className="py-16">
                    <EmptyState title="No processes" description="Add your first process" action={{ label: 'Add Process', onClick: () => setShowProcessModal(true) }} />
                  </td></tr>
                ) : (
                  processes.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="td font-medium text-slate-800">{p.name}</td>
                      <td className="td font-mono text-xs text-slate-500">{p.code}</td>
                      <td className="td">
                        {p.brands ? <span className="badge bg-indigo-100 text-indigo-700">{p.brands.name}</span> : '—'}
                      </td>
                      <td className="td"><span className={cn('badge', processTypeColor[p.process_type])}>{p.process_type?.replace(/_/g, ' ').toUpperCase()}</span></td>
                      <td className="td text-slate-500">{p.min_daily_staff}</td>
                      <td className="td">
                        <div className="flex gap-1 flex-wrap">
                          {p.operates_on_sundays && <span className="badge bg-purple-100 text-purple-600 text-xs">Sun</span>}
                          {p.operates_on_holidays && <span className="badge bg-orange-100 text-orange-600 text-xs">Hol</span>}
                          {!p.operates_on_sundays && !p.operates_on_holidays && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="td"><span className={cn('badge', p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{p.status}</span></td>
                      <td className="td text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditProcess(p)} className="icon-btn"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteProcess(p)} className="icon-btn text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Brand Modals */}
      {showBrandModal && (
        <Modal open onClose={() => setShowBrandModal(false)} title="Add Brand" size="lg">
          <BrandForm isLoading={addBrand.isPending} onSubmit={data => addBrand.mutate(data)} />
        </Modal>
      )}
      {editBrand && (
        <Modal open onClose={() => setEditBrand(null)} title="Edit Brand" size="lg">
          <BrandForm defaultValues={editBrand} isLoading={updateBrand.isPending} onSubmit={data => updateBrand.mutate({ id: editBrand.id, data })} />
        </Modal>
      )}
      {deleteBrand && (
        <ConfirmDialog open title="Delete Brand" message={`Delete brand "${deleteBrand.name}"? This cannot be undone.`} confirmLabel="Delete" confirmVariant="danger"
          onConfirm={() => deleteBrandMut.mutate(deleteBrand.id)} onCancel={() => setDeleteBrand(null)} isLoading={deleteBrandMut.isPending} />
      )}

      {/* Process Modals */}
      {showProcessModal && (
        <Modal open onClose={() => setShowProcessModal(false)} title="Add Process" size="lg">
          <ProcessForm brands={brands} isLoading={addProcess.isPending} onSubmit={data => addProcess.mutate(data)} />
        </Modal>
      )}
      {editProcess && (
        <Modal open onClose={() => setEditProcess(null)} title="Edit Process" size="lg">
          <ProcessForm brands={brands} defaultValues={{ ...editProcess, brand_id: editProcess.brand_id ?? '' }} isLoading={updateProcess.isPending} onSubmit={data => updateProcess.mutate({ id: editProcess.id, data })} />
        </Modal>
      )}
      {deleteProcess && (
        <ConfirmDialog open title="Delete Process" message={`Delete process "${deleteProcess.name}"?`} confirmLabel="Delete" confirmVariant="danger"
          onConfirm={() => deleteProcessMut.mutate(deleteProcess.id)} onCancel={() => setDeleteProcess(null)} isLoading={deleteProcessMut.isPending} />
      )}
    </div>
  );
}
