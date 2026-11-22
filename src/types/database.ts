export type UserRole = 'admin' | 'operations_manager' | 'pod_lead' | 'employee';
export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid' | 'comp_off' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type RosterStatus = 'draft' | 'published' | 'archived';
export type ScheduleStatus =
  | 'working'
  | 'weekly_off'
  | 'leave'
  | 'comp_off'
  | 'public_holiday'
  | 'not_required'
  | 'conflict';
export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_submitted'
  | 'roster_published'
  | 'roster_updated'
  | 'comp_off_assigned'
  | 'announcement';
export type ConflictSeverity = 'critical' | 'warning' | 'info';

// ---------------------------------------------------------------------------
// Row types (one per database table)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Pod {
  id: string;
  pod_name: string;
  pod_code: string;
  description?: string;
  pod_lead_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  brand_name: string;
  brand_code: string;
  description?: string;
  status: string;
  operates_365: boolean;
  operates_on_sundays: boolean;
  operates_on_holidays: boolean;
  min_daily_staff: number;
  created_at: string;
  updated_at: string;
}

export interface Process {
  id: string;
  name: string;
  code: string;
  description?: string;
  brand_id: string;
  process_type: string;
  min_daily_staff: number;
  operates_on_sundays: boolean;
  operates_on_holidays: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  designation?: string;
  role: UserRole;
  department?: string;
  pod_id?: string;
  joining_date?: string;
  employment_status: EmploymentStatus;
  weekly_off_day: number;
  secondary_weekly_off_day?: number;
  working_hours?: number;
  skills?: string[];
  notes?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  reviewed_by?: string;
  review_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompOff {
  id: string;
  employee_id: string;
  earned_date: string;
  assigned_date?: string;
  reason: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_by: string;
  brand_id?: string;
  process_id?: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RosterPeriod {
  id: string;
  month: number;
  year: number;
  status: RosterStatus;
  generated_at?: string;
  published_at?: string;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RosterEntry {
  id: string;
  roster_period_id: string;
  employee_id: string;
  date: string;
  schedule_status: ScheduleStatus;
  brand_id?: string;
  process_id?: string;
  notes?: string;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchedulingConflict {
  id: string;
  roster_period_id: string;
  employee_id?: string;
  brand_id?: string;
  process_id?: string;
  conflict_date: string;
  severity: ConflictSeverity;
  title: string;
  description: string;
  suggested_action?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  holiday_type: string;
  description?: string;
  is_national: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  email_type: string;
  subject: string;
  status: string;
  provider_message_id?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Extended types (with joined relations)
// ---------------------------------------------------------------------------

export interface EmployeeWithRelations extends Employee {
  pod?: Pod;
  brand_assignments?: { brand: Brand; is_primary: boolean }[];
  process_assignments?: { process: Process; is_primary: boolean }[];
}

export interface TaskWithRelations extends Task {
  employee?: Employee;
  brand?: Brand;
  process?: Process;
  assigner?: Profile;
}

export interface LeaveWithRelations extends LeaveRequest {
  employee?: Employee;
  reviewer?: Profile;
}

export interface RosterEntryWithRelations extends RosterEntry {
  employee?: Employee;
  brand?: Brand;
  process?: Process;
}
