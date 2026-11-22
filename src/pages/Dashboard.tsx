import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Users, Tag, GitBranch, CheckSquare, Clock, AlertTriangle,
  Calendar, TrendingUp, Plus, RefreshCw, ArrowRight, Bell,
  UserCheck, Coffee, Briefcase,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn, formatDate } from '../lib/utils';

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  title, value, icon: Icon, color, change,
}: {
  title: string; value: number | string; icon: any; color: string; change?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        {change && <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">{change}</span>}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-200" />
      </div>
      <div className="h-7 w-16 bg-slate-200 rounded mb-1" />
      <div className="h-4 w-24 bg-slate-100 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Button
// ---------------------------------------------------------------------------
function QuickAction({ label, icon: Icon, color, onClick }: {
  label: string; icon: any; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all hover:scale-105',
        color,
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', color)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Leave type badge colors
// ---------------------------------------------------------------------------
const leaveStatusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // ---- Stats ----------------------------------------------------------------
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [employees, brands, processes, pods, tasks, leaves, conflicts] = await Promise.all([
        supabase.from('employees').select('id, employment_status', { count: 'exact' }),
        supabase.from('brands').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('processes').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('pods').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('tasks').select('id, status'),
        supabase.from('leave_requests').select('id, status').eq('status', 'pending'),
        supabase.from('scheduling_conflicts').select('id', { count: 'exact' }).eq('is_resolved', false),
      ]);
      return {
        totalEmployees: employees.count ?? 0,
        activeEmployees: employees.data?.filter(e => e.employment_status === 'active').length ?? 0,
        brands: brands.count ?? 0,
        processes: processes.count ?? 0,
        pods: pods.count ?? 0,
        tasksPending: tasks.data?.filter(t => ['assigned', 'in_progress'].includes(t.status)).length ?? 0,
        tasksCompleted: tasks.data?.filter(t => t.status === 'completed').length ?? 0,
        leavePending: leaves.count ?? 0,
        coverageIssues: conflicts.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  // ---- Today's attendance ---------------------------------------------------
  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance', todayStr],
    queryFn: async () => {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, employment_status, weekly_off_day')
        .eq('employment_status', 'active');

      const { data: leavesToday } = await supabase
        .from('leave_requests')
        .select('employee_id')
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      const onLeaveIds = new Set((leavesToday ?? []).map(l => l.employee_id));
      const todayDow = today.getDay();
      const working = (employees ?? []).filter(e => !onLeaveIds.has(e.id) && e.weekly_off_day !== todayDow);
      const onWeeklyOff = (employees ?? []).filter(e => e.weekly_off_day === todayDow && !onLeaveIds.has(e.id));
      const onLeave = (employees ?? []).filter(e => onLeaveIds.has(e.id));
      return { working, onLeave, onWeeklyOff, total: (employees ?? []).length };
    },
  });

  // ---- Upcoming holidays ---------------------------------------------------
  const { data: upcomingHolidays } = useQuery({
    queryKey: ['upcoming-holidays'],
    queryFn: async () => {
      const { data } = await supabase
        .from('holidays')
        .select('id, name, date, type, is_national')
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  // ---- Pending leave requests ----------------------------------------------
  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select(`
          id, leave_type, start_date, end_date, status, reason,
          employees:employee_id (full_name, designation)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // ---- Recent tasks --------------------------------------------------------
  const { data: recentTasks } = useQuery({
    queryKey: ['recent-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date,
          assigned_to_employee:assigned_to (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  // ---- Recent activity log ------------------------------------------------
  const { data: activityLog } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('id, action, entity_type, entity_name, created_at, performed_by_name')
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // ---- Render --------------------------------------------------------------
  const statCardData = stats
    ? [
        { title: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-blue-100 text-blue-600' },
        { title: 'Active Employees', value: stats.activeEmployees, icon: UserCheck, color: 'bg-green-100 text-green-600' },
        { title: 'Brands', value: stats.brands, icon: Tag, color: 'bg-purple-100 text-purple-600' },
        { title: 'Processes', value: stats.processes, icon: GitBranch, color: 'bg-indigo-100 text-indigo-600' },
        { title: 'Pods', value: stats.pods, icon: Briefcase, color: 'bg-cyan-100 text-cyan-600' },
        { title: 'Tasks Pending', value: stats.tasksPending, icon: Clock, color: 'bg-amber-100 text-amber-600' },
        { title: 'Tasks Completed', value: stats.tasksCompleted, icon: CheckSquare, color: 'bg-teal-100 text-teal-600' },
        { title: 'Leave Requests', value: stats.leavePending, icon: Calendar, color: 'bg-orange-100 text-orange-600' },
        { title: 'Coverage Issues', value: stats.coverageIssues, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
      ]
    : [];

  const taskStatusColor: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const priorityColor: Record<string, string> = {
    low: 'text-slate-400',
    medium: 'text-amber-500',
    high: 'text-orange-500',
    critical: 'text-red-600',
  };

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {statsLoading
          ? Array.from({ length: 9 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCardData.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction label="Add Employee" icon={Users} color="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => navigate('/employees')} />
          <QuickAction label="New Leave Request" icon={Calendar} color="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => navigate('/leave')} />
          <QuickAction label="New Task" icon={CheckSquare} color="border-teal-200 text-teal-600 hover:bg-teal-50" onClick={() => navigate('/tasks')} />
          <QuickAction label="Add Holiday" icon={Bell} color="border-purple-200 text-purple-600 hover:bg-purple-50" onClick={() => navigate('/holidays')} />
          <QuickAction label="Manage Pods" icon={Briefcase} color="border-cyan-200 text-cyan-600 hover:bg-cyan-50" onClick={() => navigate('/pods')} />
          <QuickAction label="Manage Brands" icon={Tag} color="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => navigate('/brands')} />
        </div>
      </div>

      {/* Today's Status */}
      <div>
        <SectionHeader title="Today's Attendance Overview" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-700">Working Today</span>
              <span className="ml-auto text-xl font-bold text-green-700">{todayAttendance?.working.length ?? '—'}</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(todayAttendance?.working ?? []).slice(0, 6).map(e => (
                <p key={e.id} className="text-xs text-green-700 truncate">{e.full_name}</p>
              ))}
              {(todayAttendance?.working.length ?? 0) > 6 && (
                <p className="text-xs text-green-500">+{(todayAttendance!.working.length) - 6} more</p>
              )}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-700">On Leave</span>
              <span className="ml-auto text-xl font-bold text-amber-700">{todayAttendance?.onLeave.length ?? '—'}</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(todayAttendance?.onLeave ?? []).slice(0, 6).map(e => (
                <p key={e.id} className="text-xs text-amber-700 truncate">{e.full_name}</p>
              ))}
              {(todayAttendance?.onLeave.length ?? 0) > 6 && (
                <p className="text-xs text-amber-500">+{(todayAttendance!.onLeave.length) - 6} more</p>
              )}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="w-5 h-5 text-slate-500" />
              <span className="font-semibold text-slate-600">Weekly Off</span>
              <span className="ml-auto text-xl font-bold text-slate-600">{todayAttendance?.onWeeklyOff.length ?? '—'}</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(todayAttendance?.onWeeklyOff ?? []).slice(0, 6).map(e => (
                <p key={e.id} className="text-xs text-slate-500 truncate">{e.full_name}</p>
              ))}
              {(todayAttendance?.onWeeklyOff.length ?? 0) > 6 && (
                <p className="text-xs text-slate-400">+{(todayAttendance!.onWeeklyOff.length) - 6} more</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Holidays */}
        <div className="card">
          <SectionHeader
            title="Upcoming Holidays"
            action={
              <button onClick={() => navigate('/holidays')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          {!upcomingHolidays || upcomingHolidays.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No upcoming holidays</p>
          ) : (
            <ul className="space-y-3">
              {upcomingHolidays.map((h: any) => (
                <li key={h.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 text-center">
                    <div className="text-xs text-slate-400">{format(parseISO(h.date), 'MMM')}</div>
                    <div className="text-lg font-bold text-slate-800 leading-none">{format(parseISO(h.date), 'd')}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{h.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded', h.type === 'national' ? 'bg-blue-100 text-blue-600' : h.type === 'regional' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500')}>
                        {h.type}
                      </span>
                      {h.is_national && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">National</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="card">
          <SectionHeader
            title="Pending Leave Requests"
            action={
              <button onClick={() => navigate('/leave')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          {!pendingLeaves || pendingLeaves.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No pending requests</p>
          ) : (
            <ul className="space-y-3">
              {pendingLeaves.map((l: any) => (
                <li key={l.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{l.employees?.full_name}</p>
                    <p className="text-xs text-slate-500">{l.leave_type} · {formatDate(l.start_date)} – {formatDate(l.end_date)}</p>
                    {l.reason && <p className="text-xs text-slate-400 truncate mt-0.5">{l.reason}</p>}
                  </div>
                  <span className={cn('flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', leaveStatusColor[l.status] ?? 'bg-slate-100 text-slate-500')}>
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="card">
          <SectionHeader
            title="Recent Tasks"
            action={
              <button onClick={() => navigate('/tasks')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          {!recentTasks || recentTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No tasks found</p>
          ) : (
            <ul className="space-y-3">
              {recentTasks.map((t: any) => (
                <li key={t.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {t.assigned_to_employee && (
                        <span className="text-xs text-slate-400">{t.assigned_to_employee.full_name}</span>
                      )}
                      {t.due_date && (
                        <span className="text-xs text-slate-400">· due {formatDate(t.due_date)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', taskStatusColor[t.status] ?? 'bg-slate-100 text-slate-500')}>
                      {t.status?.replace('_', ' ')}
                    </span>
                    {t.priority && (
                      <TrendingUp className={cn('w-3 h-3', priorityColor[t.priority])} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <SectionHeader title="Recent Activity" />
        {!activityLog || activityLog.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activityLog.map((entry: any) => (
              <li key={entry.id} className="flex items-center gap-4 py-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-700">
                    <span className="font-medium">{entry.performed_by_name ?? 'System'}</span>{' '}
                    {entry.action}{' '}
                    <span className="font-medium">{entry.entity_name}</span>
                    {entry.entity_type && <span className="text-slate-400"> ({entry.entity_type})</span>}
                  </span>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {entry.created_at ? format(new Date(entry.created_at), 'MMM d, h:mm a') : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
