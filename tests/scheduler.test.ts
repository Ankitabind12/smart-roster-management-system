/**
 * RosterFlow — Scheduler Unit Tests
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest';
import { RosterScheduler, validateRoster } from '../src/lib/scheduler';
import type {
  Employee, Brand, Process, LeaveRequest, CompOff, Holiday, RosterEntry
} from '../src/types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const makeEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  employee_id: 'EMP001',
  full_name: 'Test Employee',
  email: 'test@example.com',
  role: 'employee',
  employment_status: 'active',
  weekly_off_day: 0, // Sunday
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeBrand = (overrides: Partial<Brand> = {}): Brand => ({
  id: 'brand-1',
  brand_name: 'TestBrand',
  brand_code: 'TB',
  status: 'active',
  operates_365: false,
  operates_on_sundays: true,
  operates_on_holidays: false,
  min_daily_staff: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeProcess = (overrides: Partial<Process> = {}): Process => ({
  id: 'proc-1',
  name: 'Customer Support',
  code: 'CS',
  brand_id: 'brand-1',
  process_type: 'cs',
  min_daily_staff: 1,
  operates_on_sundays: true,
  operates_on_holidays: false,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeLeave = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: 'leave-1',
  employee_id: 'emp-1',
  leave_type: 'casual',
  start_date: '2026-11-10',
  end_date: '2026-11-12',
  reason: 'Personal',
  status: 'approved',
  submitted_at: '2026-11-01T00:00:00Z',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...overrides,
});

const makeCompOff = (overrides: Partial<CompOff> = {}): CompOff => ({
  id: 'compoff-1',
  employee_id: 'emp-1',
  earned_date: '2026-11-01',
  assigned_date: '2026-11-15',
  reason: 'Worked on holiday',
  status: 'assigned',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...overrides,
});

const makeHoliday = (overrides: Partial<Holiday> = {}): Holiday => ({
  id: 'holiday-1',
  name: 'Test Holiday',
  date: '2026-11-14',
  holiday_type: 'national',
  is_national: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const baseInput = {
  month: 11,
  year: 2026,
  employees: [makeEmployee()],
  brands: [makeBrand()],
  processes: [makeProcess()],
  employeeBrandAssignments: [{ employee_id: 'emp-1', brand_id: 'brand-1' }],
  employeeProcessAssignments: [{ employee_id: 'emp-1', process_id: 'proc-1' }],
  approvedLeaves: [] as LeaveRequest[],
  compOffs: [] as CompOff[],
  holidays: [] as Holiday[],
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('RosterScheduler', () => {

  // Test 1: Employee on approved leave is not scheduled as working
  it('should not schedule employee on approved leave as working', () => {
    const leave = makeLeave({ start_date: '2026-11-10', end_date: '2026-11-12' });
    const scheduler = new RosterScheduler({ ...baseInput, approvedLeaves: [leave] });
    const result = scheduler.generate('period-1');

    const leaveEntries = result.entries.filter(
      e => e.employee_id === 'emp-1' &&
        e.date >= '2026-11-10' && e.date <= '2026-11-12' &&
        e.schedule_status === 'working'
    );
    expect(leaveEntries).toHaveLength(0);

    const leaveStatusEntries = result.entries.filter(
      e => e.employee_id === 'emp-1' &&
        e.date >= '2026-11-10' && e.date <= '2026-11-12' &&
        e.schedule_status === 'leave'
    );
    expect(leaveStatusEntries.length).toBeGreaterThan(0);
  });

  // Test 2: Weekly off is respected
  it('should respect employee weekly off day', () => {
    // Employee has Sunday (0) off. Find a Sunday in Nov 2026.
    // Nov 1 2026 is Sunday
    const scheduler = new RosterScheduler(baseInput);
    const result = scheduler.generate('period-1');

    const sundayEntry = result.entries.find(
      e => e.employee_id === 'emp-1' && e.date === '2026-11-01'
    );
    // Should be weekly_off (Sunday) or not_required, not working
    expect(sundayEntry?.schedule_status).not.toBe('working');
  });

  // Test 3: 365-day brand requires coverage on Sundays
  it('should detect coverage gap for 365-day brand on Sunday with no available employee', () => {
    const brand365 = makeBrand({ id: 'brand-365', operates_365: true, operates_on_sundays: true, operates_on_holidays: true });
    const proc365 = makeProcess({ id: 'proc-365', brand_id: 'brand-365', operates_on_sundays: true, operates_on_holidays: true });
    // Employee has Sunday off
    const scheduler = new RosterScheduler({
      ...baseInput,
      brands: [brand365],
      processes: [proc365],
      employees: [makeEmployee({ weekly_off_day: 0 })],
      employeeBrandAssignments: [{ employee_id: 'emp-1', brand_id: 'brand-365' }],
      employeeProcessAssignments: [{ employee_id: 'emp-1', process_id: 'proc-365' }],
    });
    const result = scheduler.generate('period-1');

    // Should have conflicts on Sundays (Nov 1, 8, 15, 22, 29)
    const sundayConflicts = result.conflicts.filter(c => c.conflict_date === '2026-11-01');
    expect(sundayConflicts.length).toBeGreaterThan(0);
    expect(sundayConflicts[0].severity).toBe('critical');
  });

  // Test 4: Brand with operates_on_holidays=false is not operational on holiday
  it('should not require coverage on holiday if brand does not operate on holidays', () => {
    const holiday = makeHoliday({ date: '2026-11-14' });
    const brand = makeBrand({ operates_on_holidays: false, operates_on_sundays: false });
    const proc = makeProcess({ operates_on_holidays: false });
    const scheduler = new RosterScheduler({
      ...baseInput,
      brands: [brand],
      processes: [proc],
      holidays: [holiday],
    });
    const result = scheduler.generate('period-1');

    // Should not have critical conflict on the holiday
    const holidayConflicts = result.conflicts.filter(
      c => c.conflict_date === '2026-11-14' && c.severity === 'critical'
    );
    expect(holidayConflicts).toHaveLength(0);
  });

  // Test 5: Single-resource brand coverage gap detected
  it('should detect critical coverage gap for single-resource brand when employee is on leave', () => {
    const leave = makeLeave({ start_date: '2026-11-03', end_date: '2026-11-03' }); // Monday
    const brand = makeBrand({ operates_on_sundays: false });
    const proc = makeProcess({ operates_on_sundays: false });
    const scheduler = new RosterScheduler({
      ...baseInput,
      brands: [brand],
      processes: [proc],
      approvedLeaves: [leave],
    });
    const result = scheduler.generate('period-1');

    const conflict = result.conflicts.find(c =>
      c.conflict_date === '2026-11-03' && c.severity === 'critical'
    );
    expect(conflict).toBeDefined();
    expect(conflict?.brand_id).toBe('brand-1');
  });

  // Test 6: Multi-resource brand maintains coverage when one employee is on leave
  it('should maintain coverage when second employee is available', () => {
    const emp2 = makeEmployee({ id: 'emp-2', employee_id: 'EMP002', full_name: 'Second Employee', weekly_off_day: 1 });
    const leave = makeLeave({ employee_id: 'emp-1', start_date: '2026-11-03', end_date: '2026-11-03' });
    const scheduler = new RosterScheduler({
      ...baseInput,
      employees: [makeEmployee(), emp2],
      approvedLeaves: [leave],
      employeeProcessAssignments: [
        { employee_id: 'emp-1', process_id: 'proc-1' },
        { employee_id: 'emp-2', process_id: 'proc-1' },
      ],
    });
    const result = scheduler.generate('period-1');

    // Should NOT have a critical conflict on Nov 3 (emp2 covers)
    const criticalConflicts = result.conflicts.filter(
      c => c.conflict_date === '2026-11-03' && c.severity === 'critical'
    );
    expect(criticalConflicts).toHaveLength(0);
  });

  // Test 7: Minimum staffing is validated
  it('should detect understaffed when min_daily_staff is 2 but only 1 available', () => {
    const proc2Staff = makeProcess({ min_daily_staff: 2 });
    const scheduler = new RosterScheduler({
      ...baseInput,
      processes: [proc2Staff],
    });
    const result = scheduler.generate('period-1');

    // Should have warnings about understaffing on working days
    const warnings = result.conflicts.filter(c => c.severity === 'warning');
    expect(warnings.length).toBeGreaterThan(0);
  });

  // Test 8: Comp-off is respected
  it('should not schedule employee as working on comp-off day', () => {
    const compOff = makeCompOff({ assigned_date: '2026-11-03' }); // Monday
    const scheduler = new RosterScheduler({ ...baseInput, compOffs: [compOff] });
    const result = scheduler.generate('period-1');

    const compOffEntry = result.entries.find(
      e => e.employee_id === 'emp-1' && e.date === '2026-11-03'
    );
    expect(compOffEntry?.schedule_status).toBe('comp_off');
    expect(compOffEntry?.schedule_status).not.toBe('working');
  });

  // Test 9: Approved leave takes priority (mandatory constraint)
  it('mandatory constraint: leave takes priority over working requirement', () => {
    const leave = makeLeave({ start_date: '2026-11-04', end_date: '2026-11-04' });
    const scheduler = new RosterScheduler({ ...baseInput, approvedLeaves: [leave] });
    const result = scheduler.generate('period-1');

    // The employee should have leave, not working
    const entry = result.entries.find(
      e => e.employee_id === 'emp-1' && e.date === '2026-11-04'
    );
    expect(entry?.schedule_status).toBe('leave');
  });

  // Test 10: Total entries covers all employees × all days
  it('should generate an entry for every employee for every day', () => {
    const daysInNov = 30;
    const scheduler = new RosterScheduler(baseInput);
    const result = scheduler.generate('period-1');

    const empEntries = result.entries.filter(e => e.employee_id === 'emp-1');
    expect(empEntries).toHaveLength(daysInNov);
  });
});

describe('validateRoster', () => {
  // Test 11: validateRoster detects employee scheduled while on leave
  it('should flag employee working while on approved leave', () => {
    const entry: RosterEntry = {
      id: 'e1', roster_period_id: 'rp1', employee_id: 'emp-1',
      date: '2026-11-10', schedule_status: 'working',
      is_manual_override: false, created_at: '', updated_at: '',
    };
    const leave = makeLeave({ start_date: '2026-11-10', end_date: '2026-11-12' });

    const conflicts = validateRoster({
      entries: [entry],
      employees: [makeEmployee()],
      brands: [], processes: [],
      leaves: [leave],
      compOffs: [],
      holidays: [],
      rosterPeriodId: 'rp1',
    });

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe('critical');
    expect(conflicts[0].title).toContain('approved leave');
  });

  // Test 12: validateRoster detects employee on weekly off
  it('should warn when employee is working on weekly off day', () => {
    // Nov 1 2026 is Sunday (0)
    const entry: RosterEntry = {
      id: 'e2', roster_period_id: 'rp1', employee_id: 'emp-1',
      date: '2026-11-01', schedule_status: 'working',
      is_manual_override: true, created_at: '', updated_at: '',
    };
    const emp = makeEmployee({ weekly_off_day: 0 }); // Sunday

    const conflicts = validateRoster({
      entries: [entry], employees: [emp], brands: [], processes: [],
      leaves: [], compOffs: [], holidays: [], rosterPeriodId: 'rp1',
    });

    const weeklyOffConflict = conflicts.find(c => c.title.includes('weekly off'));
    expect(weeklyOffConflict).toBeDefined();
    expect(weeklyOffConflict?.severity).toBe('warning');
  });

  // Test 13: validateRoster detects comp-off conflict
  it('should flag employee working on comp-off day', () => {
    const entry: RosterEntry = {
      id: 'e3', roster_period_id: 'rp1', employee_id: 'emp-1',
      date: '2026-11-15', schedule_status: 'working',
      is_manual_override: false, created_at: '', updated_at: '',
    };
    const compOff = makeCompOff({ assigned_date: '2026-11-15' });

    const conflicts = validateRoster({
      entries: [entry], employees: [makeEmployee()], brands: [], processes: [],
      leaves: [], compOffs: [compOff], holidays: [], rosterPeriodId: 'rp1',
    });

    expect(conflicts.some(c => c.title.includes('comp-off'))).toBe(true);
    expect(conflicts.find(c => c.title.includes('comp-off'))?.severity).toBe('critical');
  });
});
