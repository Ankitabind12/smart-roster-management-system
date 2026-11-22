import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';

// ---------------------------------------------------------------------------
// Tailwind class merger
// ---------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Format a date string or Date object using the given date-fns format string.
 * Defaults to "MMM d, yyyy" (e.g. "Jan 1, 2024").
 */
export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, fmt);
  } catch {
    return String(date);
  }
}

/**
 * Short date format: "d MMM" (e.g. "1 Jan").
 */
export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'd MMM');
}

/** Return the full day name for a 0-based day index (0 = Sunday). */
export function getDayName(dayIndex: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex] ?? '';
}

/**
 * Calculate the number of calendar days covered by a leave request.
 * Both dates are inclusive.
 */
export function getLeaveDays(startDate: string, endDate: string): number {
  try {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  } catch {
    return 0;
  }
}

/**
 * Human-readable relative time (e.g. "3 minutes ago").
 */
export function formatTimeAgo(date: string): string {
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true });
  } catch {
    return date;
  }
}

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/**
 * Return up to two uppercase initials from a full name.
 * "Jane Doe" → "JD", "Alice" → "A"
 */
export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generate a rough unique employee ID based on the current timestamp.
 * Example: "EMP123456"
 */
export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export function generateEmployeeId(): string {
  return `EMP${Date.now().toString().slice(-6)}`;
}

// ---------------------------------------------------------------------------
// Status / priority colour helpers
// ---------------------------------------------------------------------------

/**
 * Return a Tailwind badge class string for a generic status value.
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'draft':
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
    case 'cancelled':
    case 'terminated':
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'inactive':
    case 'on_leave':
    case 'archived':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Return a Tailwind badge class string for a task priority value.
 */
export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
}

// ---------------------------------------------------------------------------
// Colour maps (used directly by components)
// ---------------------------------------------------------------------------

export const SCHEDULE_STATUS_COLORS: Record<string, string> = {
  working: 'bg-green-100 text-green-800 border-green-200',
  weekly_off: 'bg-slate-100 text-slate-600 border-slate-200',
  leave: 'bg-amber-100 text-amber-800 border-amber-200',
  comp_off: 'bg-purple-100 text-purple-800 border-purple-200',
  public_holiday: 'bg-blue-100 text-blue-800 border-blue-200',
  not_required: 'bg-gray-50 text-gray-400 border-gray-100',
  conflict: 'bg-red-100 text-red-800 border-red-200',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};
