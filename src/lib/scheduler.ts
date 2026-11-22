/**
 * RosterFlow Scheduling Engine
 *
 * Deterministic, rule-based scheduling algorithm.
 *
 * Algorithm:
 * 1. For every date in the month, determine each employee's base status (leave/comp-off/holiday/weekly-off/working)
 * 2. For each brand/process/date requiring coverage, find eligible & available employees
 * 3. Assign employees using greedy selection with fair distribution (fewest working days first)
 * 4. Track and report coverage gaps as conflicts
 * 5. Mark unassigned employees as 'not_required'
 *
 * Mandatory constraints (never violated):
 * - Approved leave
 * - Assigned comp-off
 * - Brand/process operating rules
 *
 * Soft constraints (best-effort):
 * - Weekly off preferences
 * - Fair distribution of working days
 * - Employee process assignments
 */

import {
  addDays,
  getDaysInMonth,
  startOfMonth,
  format,
  getDay,
  parseISO,
} from 'date-fns';
import type {
  Employee,
  Brand,
  Process,
  LeaveRequest,
  CompOff,
  Holiday,
  RosterEntry,
  SchedulingConflict,
  ScheduleStatus,
  ConflictSeverity,
} from '../types/database';

export interface SchedulerInput {
  month: number; // 1-12
  year: number;
  employees: Employee[];
  brands: Brand[];
  processes: Process[];
  employeeBrandAssignments: { employee_id: string; brand_id: string }[];
  employeeProcessAssignments: { employee_id: string; process_id: string }[];
  approvedLeaves: LeaveRequest[];
  compOffs: CompOff[];
  holidays: Holiday[];
  brandHolidayRules?: { brand_id: string; holiday_id: string; is_operational: boolean }[];
}

export interface SchedulerOutput {
  entries: Omit<RosterEntry, 'id' | 'created_at' | 'updated_at'>[];
  conflicts: Omit<SchedulingConflict, 'id' | 'created_at'>[];
  summary: {
    totalSlots: number;
    coveredSlots: number;
    uncoveredSlots: number;
    totalEmployees: number;
    workingDays: Record<string, number>;
  };
  explanations: {
    employee_id: string;
    date: string;
    brand_id?: string;
    reason: string;
  }[];
}

type EntryMap = Map<string, Omit<RosterEntry, 'id' | 'created_at' | 'updated_at'>>;

export class RosterScheduler {
  private input: SchedulerInput;
  private dates: Date[];
  private holidayDates: Set<string>;
  private holidayMap: Map<string, Holiday>;

  constructor(input: SchedulerInput) {
    this.input = input;
    this.dates = this.generateDates();
    this.holidayDates = new Set(input.holidays.map((h) => h.date));
    this.holidayMap = new Map(input.holidays.map((h) => [h.date, h]));
  }

  private generateDates(): Date[] {
    const start = startOfMonth(new Date(this.input.year, this.input.month - 1, 1));
    const daysInMonth = getDaysInMonth(start);
    return Array.from({ length: daysInMonth }, (_, i) => addDays(start, i));
  }

  private formatDate(d: Date): string {
    return format(d, 'yyyy-MM-dd');
  }

  private entryKey(employeeId: string, date: string): string {
    return `${employeeId}::${date}`;
  }

  private isEmployeeOnLeave(employeeId: string, date: string): LeaveRequest | undefined {
    return this.input.approvedLeaves.find(
      (l) =>
        l.employee_id === employeeId &&
        l.status === 'approved' &&
        date >= l.start_date &&
        date <= l.end_date
    );
  }

  private isEmployeeOnCompOff(employeeId: string, date: string): CompOff | undefined {
    return this.input.compOffs.find(
      (c) =>
        c.employee_id === employeeId &&
        c.assigned_date === date &&
        c.status === 'assigned'
    );
  }

  private isEmployeeWeeklyOff(employee: Employee, date: Date): boolean {
    const dayOfWeek = getDay(date);
    return (
      employee.weekly_off_day === dayOfWeek ||
      employee.secondary_weekly_off_day === dayOfWeek
    );
  }

  private isBrandOperational(brand: Brand, date: Date, dateStr: string): boolean {
    if (brand.operates_365) return true;
    const dayOfWeek = getDay(date);
    if (dayOfWeek === 0 && !brand.operates_on_sundays) return false;
    if (this.holidayDates.has(dateStr)) {
      const holiday = this.holidayMap.get(dateStr);
      if (holiday) {
        const rule = this.input.brandHolidayRules?.find(
          (r) => r.brand_id === brand.id && r.holiday_id === holiday.id
        );
        if (rule) return rule.is_operational;
      }
      return brand.operates_on_holidays;
    }
    return true;
  }

  private isProcessOperational(process: Process, date: Date, dateStr: string): boolean {
    const dayOfWeek = getDay(date);
    if (dayOfWeek === 0 && !process.operates_on_sundays) return false;
    if (this.holidayDates.has(dateStr) && !process.operates_on_holidays) return false;
    return true;
  }

  private getEmployeesAssignedToProcess(processId: string): string[] {
    return this.input.employeeProcessAssignments
      .filter((a) => a.process_id === processId)
      .map((a) => a.employee_id);
  }

  private getAvailableEmployees(
    processId: string,
    date: Date,
    dateStr: string,
    alreadyAssigned: Set<string>
  ): Employee[] {
    const eligibleIds = new Set(this.getEmployeesAssignedToProcess(processId));
    return this.input.employees.filter((emp) => {
      if (!eligibleIds.has(emp.id)) return false;
      if (emp.employment_status !== 'active') return false;
      if (this.isEmployeeOnLeave(emp.id, dateStr)) return false;
      if (this.isEmployeeOnCompOff(emp.id, dateStr)) return false;
      if (this.isEmployeeWeeklyOff(emp, date)) return false;
      if (alreadyAssigned.has(emp.id)) return false;
      return true;
    });
  }

  public generate(rosterPeriodId: string): SchedulerOutput {
    const entryMap: EntryMap = new Map();
    const conflicts: Omit<SchedulingConflict, 'id' | 'created_at'>[] = [];
    const explanations: SchedulerOutput['explanations'] = [];
    const workingDays: Record<string, number> = {};
    let totalSlots = 0;
    let coveredSlots = 0;

    // Track per-date assignments for fair distribution
    const dailyAssigned: Map<string, Set<string>> = new Map();
    for (const date of this.dates) {
      dailyAssigned.set(this.formatDate(date), new Set());
    }

    // ── Pass 1: Mark unavailable employees (leave, comp-off, holiday, weekly-off) ──
    for (const emp of this.input.employees) {
      for (const date of this.dates) {
        const dateStr = this.formatDate(date);
        const key = this.entryKey(emp.id, dateStr);

        const leave = this.isEmployeeOnLeave(emp.id, dateStr);
        if (leave) {
          entryMap.set(key, {
            roster_period_id: rosterPeriodId,
            employee_id: emp.id,
            date: dateStr,
            schedule_status: 'leave',
            notes: `${leave.leave_type} leave`,
            is_manual_override: false,
          });
          dailyAssigned.get(dateStr)!.add(emp.id);
          continue;
        }

        const compOff = this.isEmployeeOnCompOff(emp.id, dateStr);
        if (compOff) {
          entryMap.set(key, {
            roster_period_id: rosterPeriodId,
            employee_id: emp.id,
            date: dateStr,
            schedule_status: 'comp_off',
            notes: `Comp-off: ${compOff.reason}`,
            is_manual_override: false,
          });
          dailyAssigned.get(dateStr)!.add(emp.id);
          continue;
        }
      }
    }

    // ── Pass 2: Assign employees to coverage slots ──
    for (const brand of this.input.brands) {
      if (brand.status !== 'active') continue;
      const brandProcesses = this.input.processes.filter(
        (p) => p.brand_id === brand.id && p.status === 'active'
      );

      for (const process of brandProcesses) {
        for (const date of this.dates) {
          const dateStr = this.formatDate(date);
          if (!this.isBrandOperational(brand, date, dateStr)) continue;
          if (!this.isProcessOperational(process, date, dateStr)) continue;

          totalSlots++;
          const required = Math.max(1, process.min_daily_staff);
          const alreadyAssigned = dailyAssigned.get(dateStr)!;
          const available = this.getAvailableEmployees(process.id, date, dateStr, alreadyAssigned);

          // Sort by fewest working days (fair distribution)
          available.sort(
            (a, b) => (workingDays[a.id] ?? 0) - (workingDays[b.id] ?? 0)
          );

          const assigned = available.slice(0, required);

          if (assigned.length >= required) {
            coveredSlots++;
          } else {
            const severity: ConflictSeverity = assigned.length === 0 ? 'critical' : 'warning';
            const allEligible = this.getEmployeesAssignedToProcess(process.id)
              .map((id) => this.input.employees.find((e) => e.id === id))
              .filter(Boolean) as Employee[];

            conflicts.push({
              roster_period_id: rosterPeriodId,
              brand_id: brand.id,
              process_id: process.id,
              conflict_date: dateStr,
              severity,
              title:
                assigned.length === 0
                  ? `No coverage — ${brand.brand_name} · ${process.name}`
                  : `Understaffed — ${brand.brand_name} · ${process.name}`,
              description:
                assigned.length === 0
                  ? `${process.name} for ${brand.brand_name} requires ${required} employee(s) on ${dateStr}, but no eligible employee is available.`
                  : `${process.name} for ${brand.brand_name} requires ${required} employee(s) on ${dateStr}, but only ${assigned.length} available.`,
              suggested_action:
                allEligible.length > 0
                  ? `Assigned employees: ${allEligible.map((e) => e.full_name).join(', ')}. Check leave/comp-off or assign an additional employee.`
                  : `No employees assigned to ${process.code}. Assign employees to this process.`,
              is_resolved: false,
            });
          }

          // Create working entries for assigned employees
          for (const emp of assigned) {
            alreadyAssigned.add(emp.id);
            workingDays[emp.id] = (workingDays[emp.id] ?? 0) + 1;
            const key = this.entryKey(emp.id, dateStr);

            if (!entryMap.has(key)) {
              entryMap.set(key, {
                roster_period_id: rosterPeriodId,
                employee_id: emp.id,
                date: dateStr,
                schedule_status: 'working',
                brand_id: brand.id,
                process_id: process.id,
                notes: `${brand.brand_name} — ${process.name}`,
                is_manual_override: false,
              });
              explanations.push({
                employee_id: emp.id,
                date: dateStr,
                brand_id: brand.id,
                reason: `Assigned to ${brand.brand_name} ${process.name}: required coverage, assigned to process, available, selected for fair workload distribution (${workingDays[emp.id]} days this month).`,
              });
            }
          }
        }
      }
    }

    // ── Pass 3: Fill remaining dates with public_holiday, weekly_off, or not_required ──
    for (const emp of this.input.employees) {
      for (const date of this.dates) {
        const dateStr = this.formatDate(date);
        const key = this.entryKey(emp.id, dateStr);

        if (entryMap.has(key)) continue;

        // Check if it's a public holiday
        if (this.holidayDates.has(dateStr)) {
          const holiday = this.holidayMap.get(dateStr)!;
          entryMap.set(key, {
            roster_period_id: rosterPeriodId,
            employee_id: emp.id,
            date: dateStr,
            schedule_status: 'public_holiday',
            notes: holiday.name,
            is_manual_override: false,
          });
          continue;
        }

        // Check if it's weekly off
        if (this.isEmployeeWeeklyOff(emp, date)) {
          entryMap.set(key, {
            roster_period_id: rosterPeriodId,
            employee_id: emp.id,
            date: dateStr,
            schedule_status: 'weekly_off',
            notes: `Weekly off`,
            is_manual_override: false,
          });
          continue;
        }

        entryMap.set(key, {
          roster_period_id: rosterPeriodId,
          employee_id: emp.id,
          date: dateStr,
          schedule_status: 'not_required',
          is_manual_override: false,
        });
      }
    }

    return {
      entries: Array.from(entryMap.values()),
      conflicts,
      summary: {
        totalSlots,
        coveredSlots,
        uncoveredSlots: totalSlots - coveredSlots,
        totalEmployees: this.input.employees.length,
        workingDays,
      },
      explanations,
    };
  }
}

/**
 * Validate an existing roster for conflicts.
 * Returns list of detected issues.
 */
export function validateRoster(params: {
  entries: RosterEntry[];
  employees: Employee[];
  brands: Brand[];
  processes: Process[];
  leaves: LeaveRequest[];
  compOffs: CompOff[];
  holidays: Holiday[];
  rosterPeriodId: string;
}): Omit<SchedulingConflict, 'id' | 'created_at'>[] {
  const { entries, employees, leaves, compOffs, holidays, rosterPeriodId } = params;
  const conflicts: Omit<SchedulingConflict, 'id' | 'created_at'>[] = [];
  const holidayDates = new Set(holidays.map((h) => h.date));
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  for (const entry of entries) {
    if (entry.schedule_status !== 'working') continue;

    const employee = employeeMap.get(entry.employee_id);
    if (!employee) continue;

    // Check: working while on approved leave
    const onLeave = leaves.find(
      (l) =>
        l.employee_id === entry.employee_id &&
        l.status === 'approved' &&
        entry.date >= l.start_date &&
        entry.date <= l.end_date
    );
    if (onLeave) {
      conflicts.push({
        roster_period_id: rosterPeriodId,
        employee_id: entry.employee_id,
        brand_id: entry.brand_id,
        process_id: entry.process_id,
        conflict_date: entry.date,
        severity: 'critical',
        title: `${employee.full_name} scheduled while on approved leave`,
        description: `${employee.full_name} has an approved ${onLeave.leave_type} leave on ${entry.date} but is scheduled as working.`,
        suggested_action: 'Remove the working entry or find a replacement employee.',
        is_resolved: false,
      });
    }

    // Check: working on weekly off day
    const date = parseISO(entry.date);
    const dayOfWeek = getDay(date);
    if (
      employee.weekly_off_day === dayOfWeek ||
      employee.secondary_weekly_off_day === dayOfWeek
    ) {
      conflicts.push({
        roster_period_id: rosterPeriodId,
        employee_id: entry.employee_id,
        conflict_date: entry.date,
        severity: 'warning',
        title: `${employee.full_name} scheduled on weekly off day`,
        description: `${entry.date} is ${employee.full_name}'s weekly off day, but they are scheduled as working.`,
        suggested_action: 'Issue a comp-off if justified, or move the weekly off.',
        is_resolved: false,
      });
    }

    // Check: working on assigned comp-off
    const onCompOff = compOffs.find(
      (c) =>
        c.employee_id === entry.employee_id &&
        c.assigned_date === entry.date &&
        c.status === 'assigned'
    );
    if (onCompOff) {
      conflicts.push({
        roster_period_id: rosterPeriodId,
        employee_id: entry.employee_id,
        conflict_date: entry.date,
        severity: 'critical',
        title: `${employee.full_name} scheduled on comp-off day`,
        description: `${employee.full_name} has a comp-off on ${entry.date} but is scheduled as working.`,
        suggested_action: 'Remove the working entry or reassign the comp-off date.',
        is_resolved: false,
      });
    }

    // Info: working on a public holiday
    if (holidayDates.has(entry.date)) {
      const holiday = holidays.find((h) => h.date === entry.date);
      conflicts.push({
        roster_period_id: rosterPeriodId,
        employee_id: entry.employee_id,
        conflict_date: entry.date,
        severity: 'info',
        title: `${employee.full_name} working on public holiday: ${holiday?.name}`,
        description: `${employee.full_name} is scheduled to work on ${holiday?.name} (${entry.date}). Verify this is intentional.`,
        suggested_action: 'If not intentional, change status to public_holiday.',
        is_resolved: false,
      });
    }
  }

  return conflicts;
}
