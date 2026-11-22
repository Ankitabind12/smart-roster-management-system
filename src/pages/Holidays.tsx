import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, PartyPopper, Globe, Building2, Calendar } from 'lucide-react';
import { Modal, ConfirmDialog } from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { EmptyState } from '../components/shared/EmptyState';
import { SkeletonRow } from '../components/shared/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, formatDate, capitalizeFirst } from '../lib/utils';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import type { Holiday } from '../types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────
const holidaySchema = z.object({
  name: z.string().min(2, 'Holiday name is required'),
  date: z.string().min(1, 'Date is required'),
  holiday_type: z.enum(['national', 'regional', 'company', 'optional']),
  description: z.string().optional(),
  is_national: z.boolean(),
});
type HolidayFormData = z.infer<typeof holidaySchema>;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const TYPE_COLORS: Record<string, string> = {
  national: 'bg-red-100 text-red-700',
  regional: 'bg-amber-100 text-amber-700',
  company: 'bg-blue-100 text-blue-700',
  optional: 'bg-purple-100 text-purple-700',
};

// ─────────────────────────────────────────────────────────────────────────────
// Holiday Form
// ─────────────────────────────────────────────────────────────────────────────
function HolidayForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<HolidayFormData>;
  onSubmit: (data: HolidayFormData) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { holiday_type: 'national', is_national: true, ...defaultValues },
  });

  return (
    <form id="holiday-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Name *</label>
        <input {...register('name')} className="input-field" placeholder="e.g. Republic Day" />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
          <input type="date" {...register('date')} className="input-field" />
          {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select {...register('holiday_type')} className="select-field">
            <option value="national">National</option>
            <option value="regional">Regional</option>
            <option value="company">Company</option>
            <option value="optional">Optional</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea {...register('description')} rows={2} className="input-field resize-none" placeholder="Optional description..." />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_national" {...register('is_national')} className="w-4 h-4 text-primary-600 rounded" />
        <label htmlFor="is_national" className="text-sm text-slate-700">National / Company-wide holiday</label>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function HolidaysPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date');
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const { error } = await supabase.from('holidays').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday added');
      setShowAdd(false);
    },
    onError: (err: any) => toast.error('Failed to add holiday', err.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...data }: HolidayFormData & { id: string }) => {
      const { error } = await supabase.from('holidays').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday updated');
      setEditHoliday(null);
    },
    onError: (err: any) => toast.error('Failed to update holiday', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted');
      setDeleteHoliday(null);
    },
    onError: (err: any) => toast.error('Failed to delete holiday', err.message),
  });

  const filtered = holidays.filter((h: Holiday) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by month
  const byMonth: Record<number, Holiday[]> = {};
  for (const h of filtered) {
    const m = getMonth(parseISO(h.date));
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Holidays</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage public and company holidays</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="btn-secondary py-1.5 px-2.5">‹</button>
          <span className="text-sm font-semibold text-slate-900 w-12 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="btn-secondary py-1.5 px-2.5">›</button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-56" placeholder="Search holidays..." />
        </div>
        <div className="ml-auto text-sm text-slate-500">
          <strong className="text-slate-900">{holidays.length}</strong> holidays in {year}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['national','regional','company','optional'] as const).map(type => {
          const count = holidays.filter((h: Holiday) => h.holiday_type === type).length;
          return (
            <div key={type} className="stat-card">
              <p className="text-2xl font-bold text-slate-900 mb-0.5">{count}</p>
              <p className="text-sm text-slate-500">{capitalizeFirst(type)} Holidays</p>
            </div>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card">
          <table className="w-full">
            <tbody>{Array.from({length:5}).map((_,i)=><SkeletonRow key={i} cols={5} />)}</tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="w-6 h-6" />}
          title="No holidays found"
          description={search ? 'No holidays match your search.' : `No holidays configured for ${year}.`}
          action={!search ? <button onClick={() => setShowAdd(true)} className="btn-primary">Add Holiday</button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([month, monthHolidays]) => (
              <div key={month} className="card">
                <div className="card-header flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <h2 className="text-sm font-semibold text-slate-800">{MONTHS[Number(month)]}</h2>
                  <span className="ml-auto text-xs text-slate-400">{monthHolidays.length} holiday{monthHolidays.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {monthHolidays.map((h: Holiday) => (
                    <div key={h.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[52px]">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">
                            {format(parseISO(h.date), 'EEE')}
                          </p>
                          <p className="text-xl font-bold text-slate-900 leading-tight">
                            {format(parseISO(h.date), 'd')}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{h.name}</p>
                            {h.is_national && (
                              <Globe className="w-3.5 h-3.5 text-slate-400" title="National holiday" />
                            )}
                          </div>
                          {h.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('badge text-xs', TYPE_COLORS[h.holiday_type] ?? 'bg-slate-100 text-slate-600')}>
                          {capitalizeFirst(h.holiday_type)}
                        </span>
                        <button onClick={() => setEditHoliday(h)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteHoliday(h)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Holiday" size="md"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button form="holiday-form" type="submit" className="btn-primary" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add Holiday'}
            </button>
          </>
        }>
        <HolidayForm onSubmit={addMutation.mutate} loading={addMutation.isPending} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editHoliday} onClose={() => setEditHoliday(null)} title="Edit Holiday" size="md"
        footer={
          <>
            <button onClick={() => setEditHoliday(null)} className="btn-secondary">Cancel</button>
            <button form="holiday-form" type="submit" className="btn-primary" disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }>
        {editHoliday && (
          <HolidayForm
            defaultValues={editHoliday}
            onSubmit={data => editMutation.mutate({ id: editHoliday.id, ...data })}
            loading={editMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteHoliday}
        onClose={() => setDeleteHoliday(null)}
        onConfirm={() => deleteMutation.mutate(deleteHoliday!.id)}
        title="Delete Holiday"
        message={`Are you sure you want to delete "${deleteHoliday?.name}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
