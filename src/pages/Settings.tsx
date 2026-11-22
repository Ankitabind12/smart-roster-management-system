import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Mail, Shield, Bell, Database, Building2,
  AlertCircle, CheckCircle, Send, ChevronRight, X,
  UserPlus, Trash2, Eye, EyeOff, RefreshCw, Upload,
  Clock, Globe, Users, Download, AlertTriangle, Info,
  Toggle
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Supabase ────────────────────────────────────────────────────────────────


// ─── Types ───────────────────────────────────────────────────────────────────
interface AppSettings {
  id?: string;
  company_name: string;
  timezone: string;
  work_start_time: string;
  work_end_time: string;
  default_weekly_off_day: number;
  min_staffing_per_shift: number;
  email_from: string;
  email_notifications_enabled: boolean;
  notify_task_assigned: boolean;
  notify_leave_approved: boolean;
  notify_roster_published: boolean;
  notify_conflict_detected: boolean;
  notify_comp_off_assigned: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
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

// ─── Default settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  company_name: 'RosterFlow',
  timezone: 'Asia/Kolkata',
  work_start_time: '09:00',
  work_end_time: '18:00',
  default_weekly_off_day: 0,
  min_staffing_per_shift: 1,
  email_from: 'noreply@example.com',
  email_notifications_enabled: false,
  notify_task_assigned: true,
  notify_leave_approved: true,
  notify_roster_published: true,
  notify_conflict_detected: true,
  notify_comp_off_assigned: true,
};

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type SectionKey = 'company' | 'email' | 'notifications' | 'scheduling' | 'users' | 'data';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'company', label: 'Company Profile', icon: <Building2 size={16} /> },
  { key: 'email', label: 'Email Configuration', icon: <Mail size={16} /> },
  { key: 'notifications', label: 'Notification Preferences', icon: <Bell size={16} /> },
  { key: 'scheduling', label: 'Scheduling Defaults', icon: <Clock size={16} /> },
  { key: 'users', label: 'User Management', icon: <Users size={16} /> },
  { key: 'data', label: 'Data Management', icon: <Database size={16} /> },
];

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50',
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function FormField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function CompanySection({ settings, onChange }: { settings: AppSettings; onChange: (k: keyof AppSettings, v: any) => void }) {
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div className="flex flex-col gap-0">
      <FormField label="Company Name" description="Displayed across the application">
        <input value={settings.company_name} onChange={e => onChange('company_name', e.target.value)} className={cn(inp, 'w-56')} />
      </FormField>
      <FormField label="Logo" description="Upload a company logo (optional)">
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Upload size={14} /> Upload Logo
        </button>
      </FormField>
      <FormField label="Timezone" description="Used for scheduling and date calculations">
        <select value={settings.timezone} onChange={e => onChange('timezone', e.target.value)} className={cn(inp, 'w-56')}>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </FormField>
      <FormField label="Working Hours" description="Default shift start and end times">
        <div className="flex items-center gap-2">
          <input type="time" value={settings.work_start_time} onChange={e => onChange('work_start_time', e.target.value)} className={cn(inp, 'w-28')} />
          <span className="text-gray-500 text-sm">to</span>
          <input type="time" value={settings.work_end_time} onChange={e => onChange('work_end_time', e.target.value)} className={cn(inp, 'w-28')} />
        </div>
      </FormField>
    </div>
  );
}

function EmailSection({ settings, onChange, onTestEmail, testEmailLoading }: {
  settings: AppSettings; onChange: (k: keyof AppSettings, v: any) => void;
  onTestEmail: () => void; testEmailLoading: boolean;
}) {
  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const resendKeyConfigured = !!(import.meta.env.VITE_RESEND_CONFIGURED === 'true');

  return (
    <div className="flex flex-col gap-0">
      {/* Status banner */}
      {!resendKeyConfigured ? (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm mb-2">⚠️ Email notifications are not configured.</p>
              <p className="text-sm text-amber-700 mb-2">To enable email notifications:</p>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Create a Resend account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com</a></li>
                <li>Add your domain and get an API key</li>
                <li>Set <code className="bg-amber-100 px-1 rounded font-mono text-xs">RESEND_API_KEY</code> in your Supabase Edge Function environment</li>
                <li>Set <code className="bg-amber-100 px-1 rounded font-mono text-xs">VITE_APP_URL</code> in your <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env</code> file</li>
                <li>Click "Send Test Email" to verify</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle size={16} /> Resend API key is configured and ready
        </div>
      )}

      <FormField label="Email Notifications" description="Enable or disable all email notifications">
        <ToggleSwitch checked={settings.email_notifications_enabled} onChange={v => onChange('email_notifications_enabled', v)} />
      </FormField>
      <FormField label="From Email Address" description="Sender address for outgoing emails">
        <input
          value={settings.email_from}
          onChange={e => onChange('email_from', e.target.value)}
          type="email"
          placeholder="noreply@yourcompany.com"
          className={cn(inp, 'w-64')}
        />
      </FormField>
      <FormField label="Send Test Email" description="Verify your email configuration is working">
        <button
          onClick={onTestEmail}
          disabled={testEmailLoading || !settings.email_notifications_enabled}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {testEmailLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          {testEmailLoading ? 'Sending...' : 'Send Test Email'}
        </button>
      </FormField>
    </div>
  );
}

function NotificationsSection({ settings, onChange }: { settings: AppSettings; onChange: (k: keyof AppSettings, v: any) => void }) {
  const prefs: { key: keyof AppSettings; label: string; description: string }[] = [
    { key: 'notify_task_assigned', label: 'Task Assigned', description: 'Notify employees when a task is assigned to them' },
    { key: 'notify_leave_approved', label: 'Leave Approved', description: 'Notify employees when their leave request is approved or rejected' },
    { key: 'notify_roster_published', label: 'Roster Published', description: 'Notify all employees when the monthly roster is published' },
    { key: 'notify_conflict_detected', label: 'Conflict Detected', description: 'Alert managers when a scheduling conflict is found' },
    { key: 'notify_comp_off_assigned', label: 'Comp Off Assigned', description: 'Notify employees when a comp off is assigned to them' },
  ];

  return (
    <div>
      {!settings.email_notifications_enabled && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 text-gray-500 text-sm">
          <Info size={14} /> Enable email notifications above to send emails for these events.
        </div>
      )}
      {prefs.map(p => (
        <FormField key={p.key} label={p.label} description={p.description}>
          <ToggleSwitch
            checked={settings[p.key] as boolean}
            onChange={v => onChange(p.key, v)}
            disabled={!settings.email_notifications_enabled}
          />
        </FormField>
      ))}
    </div>
  );
}

function SchedulingSection({ settings, onChange }: { settings: AppSettings; onChange: (k: keyof AppSettings, v: any) => void }) {
  const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div>
      <FormField label="Default Weekly Off Day" description="The default day off when not explicitly set for an employee">
        <select value={settings.default_weekly_off_day} onChange={e => onChange('default_weekly_off_day', Number(e.target.value))} className={cn(inp, 'w-40')}>
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </FormField>
      <FormField label="Minimum Staffing per Shift" description="Minimum number of employees required per active brand per day">
        <input
          type="number" min={1} max={100}
          value={settings.min_staffing_per_shift}
          onChange={e => onChange('min_staffing_per_shift', Number(e.target.value))}
          className={cn(inp, 'w-24')}
        />
      </FormField>
    </div>
  );
}

function UsersSection() {
  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ['app-users'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, full_name, employment_status').order('full_name');
      return (data ?? []).map(e => ({ id: e.id, email: '', full_name: e.full_name, role: 'employee' }));
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} team members</p>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 opacity-60 cursor-not-allowed" disabled>
          <UserPlus size={14} /> Invite User (coming soon)
        </button>
      </div>
      {isLoading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Role</th>
                <th className="px-4 py-3 text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map((u, i) => (
                <tr key={u.id} className={cn('border-b border-gray-100', i === users.length - 1 && 'border-b-0')}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length > 10 && (
            <div className="px-4 py-3 text-xs text-gray-400 text-center border-t">
              +{users.length - 10} more employees
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataSection({ onExport, onClearTest, clearing }: {
  onExport: () => void; onClearTest: () => void; clearing: boolean;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800 text-sm">Export All Data</p>
          <p className="text-xs text-gray-500 mt-0.5">Download a full CSV export of roster, tasks, and employees</p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div className="p-4 bg-white border border-red-200 rounded-xl flex items-center justify-between">
        <div>
          <p className="font-medium text-red-700 text-sm">Clear Test Data</p>
          <p className="text-xs text-gray-500 mt-0.5">Remove all draft roster entries and test notifications</p>
        </div>
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-medium">Are you sure?</span>
            <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 rounded-lg border text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => { onClearTest(); setConfirmClear(false); }}
              disabled={clearing}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60"
            >
              {clearing ? 'Clearing...' : 'Yes, Clear'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50"
          >
            <Trash2 size={14} /> Clear Test Data
          </button>
        )}
      </div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-start gap-2">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>All data is stored in your Supabase project. Access your Supabase dashboard for advanced data management, row-level security settings, and backups.</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const qc = useQueryClient();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<SectionKey>('company');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  // ── Load settings ──
  useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('*').single();
      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setIsDirty(false);
      }
      return data;
    },
  });

  const handleChange = useCallback((key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  // ── Save ──
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('app_settings').upsert(settings, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); toast.success('Settings saved'); setIsDirty(false); },
    onError: (e: any) => toast.error('Failed to save', e.message),
  });

  // ── Test email ──
  const testEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: { type: 'test', email: settings.email_from, subject: 'Test Email from RosterFlow', message: 'Your email configuration is working correctly!' },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Test email sent!', `Sent to ${settings.email_from}`),
    onError: (e: any) => toast.error('Failed to send test email', e.message ?? 'Check your Resend configuration'),
  });

  // ── Export ──
  const exportData = useCallback(async () => {
    const { data: employees } = await supabase.from('employees').select('*');
    const { data: entries } = await supabase.from('roster_entries').select('*').order('date');
    const rows = ['Employee Data', 'id,full_name,employment_status,pod_id', ...(employees ?? []).map(e => `"${e.id}","${e.full_name}","${e.employment_status}","${e.pod_id ?? ''}"`), '', 'Roster Entries', 'employee_id,date,schedule_status', ...(entries ?? []).map(e => `"${e.employee_id}","${e.date}","${e.schedule_status}"`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rosterflow-export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export ready');
  }, []);

  // ── Clear test data ──
  const clearTest = useMutation({
    mutationFn: async () => {
      await supabase.from('roster_entries').delete().eq('is_manual_override', false);
      await supabase.from('notifications').delete().eq('is_read', true);
    },
    onSuccess: () => toast.success('Test data cleared'),
    onError: (e: any) => toast.error('Failed to clear', e.message),
  });

  const renderSection = () => {
    switch (activeSection) {
      case 'company': return <CompanySection settings={settings} onChange={handleChange} />;
      case 'email': return <EmailSection settings={settings} onChange={handleChange} onTestEmail={() => testEmail.mutate()} testEmailLoading={testEmail.isPending} />;
      case 'notifications': return <NotificationsSection settings={settings} onChange={handleChange} />;
      case 'scheduling': return <SchedulingSection settings={settings} onChange={handleChange} />;
      case 'users': return <UsersSection />;
      case 'data': return <DataSection onExport={exportData} onClearTest={() => clearTest.mutate()} clearing={clearTest.isPending} />;
    }
  };

  const currentSection = SECTIONS.find(s => s.key === activeSection);

  return (
    <div className="flex h-full bg-gray-50">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />

      {/* ── Sidebar nav ── */}
      <div className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="px-4 py-4 border-b">
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configure your workspace</p>
        </div>
        <nav className="flex-1 py-2">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left',
                activeSection === s.key
                  ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={cn('shrink-0', activeSection === s.key ? 'text-indigo-600' : 'text-gray-400')}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-indigo-600">{currentSection?.icon}</span>
            <h2 className="text-lg font-semibold text-gray-900">{currentSection?.label}</h2>
          </div>
          {activeSection !== 'users' && activeSection !== 'data' && (
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !isDirty}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDirty
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {save.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {save.isPending ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
            </button>
          )}
        </div>

        {/* Section body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
