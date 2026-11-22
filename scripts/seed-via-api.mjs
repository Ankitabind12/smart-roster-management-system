/**
 * seed-via-api.mjs — Seeds RosterFlow DB via Supabase REST API
 * Run: node scripts/seed-via-api.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mukbsmqzoizhcfafjszo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) { console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1); }

const baseHeaders = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

async function upsert(table, rows) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...baseHeaders, 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`⚠️  ${table}: ${res.status} — ${txt.slice(0, 300)}`);
  } else {
    console.log(`✅  ${table}: ${rows.length} rows inserted`);
  }
}

async function checkTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  return res.ok;
}

const uuid = () => crypto.randomUUID();
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

async function main() {
  console.log('🌱 Seeding RosterFlow DB via REST API…\n');

  // Check tables exist
  const tablesOk = await checkTable('pods');
  if (!tablesOk) {
    console.error('❌ Database tables missing! Run the SQL migration first:');
    console.error('   https://supabase.com/dashboard/project/mukbsmqzoizhcfafjszo/sql/new');
    process.exit(1);
  }

  // ── Pods ───────────────────────────────────────────────────────────────────
  const podIds = { alpha: uuid(), beta: uuid(), gamma: uuid(), delta: uuid() };
  await upsert('pods', [
    { id: podIds.alpha, pod_name: 'Alpha Squad',  pod_code: 'ALPHA', status: 'active', description: 'Customer support & onboarding' },
    { id: podIds.beta,  pod_name: 'Beta Force',   pod_code: 'BETA',  status: 'active', description: 'Order management & fulfillment' },
    { id: podIds.gamma, pod_name: 'Gamma Strike', pod_code: 'GAMMA', status: 'active', description: 'Retention & loyalty programs' },
    { id: podIds.delta, pod_name: 'Delta Core',   pod_code: 'DELTA', status: 'active', description: 'NDR & escalations' },
  ]);

  // ── Brands ─────────────────────────────────────────────────────────────────
  const brandIds = {
    luxe: uuid(), swift: uuid(), nova: uuid(), peak: uuid(), orbit: uuid(),
    titan: uuid(), echo: uuid(), prime: uuid(), zest: uuid(), arc: uuid(),
  };
  await upsert('brands', [
    { id: brandIds.luxe,  brand_name: 'LuxeWear',    brand_code: 'LW',  status: 'active', operates_365: false, operates_on_sundays: true,  min_daily_staff: 5 },
    { id: brandIds.swift, brand_name: 'SwiftShip',   brand_code: 'SS',  status: 'active', operates_365: true,  operates_on_sundays: true,  min_daily_staff: 8 },
    { id: brandIds.nova,  brand_name: 'NovaHealth',  brand_code: 'NH',  status: 'active', operates_365: false, operates_on_sundays: false, min_daily_staff: 4 },
    { id: brandIds.peak,  brand_name: 'PeakFit',     brand_code: 'PF',  status: 'active', operates_365: false, operates_on_sundays: true,  min_daily_staff: 3 },
    { id: brandIds.orbit, brand_name: 'OrbitTech',   brand_code: 'OT',  status: 'active', operates_365: false, operates_on_sundays: false, min_daily_staff: 6 },
    { id: brandIds.titan, brand_name: 'TitanGear',   brand_code: 'TG',  status: 'active', operates_365: false, operates_on_sundays: true,  min_daily_staff: 4 },
    { id: brandIds.echo,  brand_name: 'EchoStyle',   brand_code: 'ES',  status: 'active', operates_365: false, operates_on_sundays: false, min_daily_staff: 3 },
    { id: brandIds.prime, brand_name: 'PrimeMart',   brand_code: 'PM',  status: 'active', operates_365: true,  operates_on_sundays: true,  min_daily_staff: 10 },
    { id: brandIds.zest,  brand_name: 'ZestKitchen', brand_code: 'ZK',  status: 'active', operates_365: false, operates_on_sundays: false, min_daily_staff: 2 },
    { id: brandIds.arc,   brand_name: 'ArcSports',   brand_code: 'ARC', status: 'active', operates_365: false, operates_on_sundays: true,  min_daily_staff: 5 },
  ]);

  // ── Processes ──────────────────────────────────────────────────────────────
  const procIds = Array.from({ length: 12 }, () => uuid());
  await upsert('processes', [
    { id: procIds[0],  name: 'Customer Support',   code: 'CS01',  brand_id: brandIds.luxe,  process_type: 'cs',               status: 'active', min_daily_staff: 3 },
    { id: procIds[1],  name: 'Order Management',   code: 'OM01',  brand_id: brandIds.swift, process_type: 'order_management', status: 'active', min_daily_staff: 4 },
    { id: procIds[2],  name: 'NDR Resolution',     code: 'NDR01', brand_id: brandIds.swift, process_type: 'ndr',              status: 'active', min_daily_staff: 2 },
    { id: procIds[3],  name: 'Health Queries',     code: 'HQ01',  brand_id: brandIds.nova,  process_type: 'cs',               status: 'active', min_daily_staff: 2 },
    { id: procIds[4],  name: 'Returns & Refunds',  code: 'RR01',  brand_id: brandIds.peak,  process_type: 'cs',               status: 'active', min_daily_staff: 2 },
    { id: procIds[5],  name: 'Tech Support',       code: 'TS01',  brand_id: brandIds.orbit, process_type: 'cs',               status: 'active', min_daily_staff: 3 },
    { id: procIds[6],  name: 'Retention Campaign', code: 'RC01',  brand_id: brandIds.prime, process_type: 'retention',        status: 'active', min_daily_staff: 4 },
    { id: procIds[7],  name: 'Account Management', code: 'AM01',  brand_id: brandIds.titan, process_type: 'acc',              status: 'active', min_daily_staff: 2 },
    { id: procIds[8],  name: 'Escalation Desk',    code: 'ED01',  brand_id: brandIds.arc,   process_type: 'cs',               status: 'active', min_daily_staff: 2 },
    { id: procIds[9],  name: 'Chat Support',       code: 'CH01',  brand_id: brandIds.echo,  process_type: 'cs',               status: 'active', min_daily_staff: 2 },
    { id: procIds[10], name: 'Fulfilment Ops',     code: 'FO01',  brand_id: brandIds.zest,  process_type: 'order_management', status: 'active', min_daily_staff: 1 },
    { id: procIds[11], name: 'Loyalty & Rewards',  code: 'LR01',  brand_id: brandIds.prime, process_type: 'retention',        status: 'active', min_daily_staff: 3 },
  ]);

  // ── Employees ──────────────────────────────────────────────────────────────
  const firstNames = ['Priya','Rahul','Anjali','Vikram','Sneha','Arjun','Pooja','Rohit','Kavya','Amit',
                      'Deepika','Suresh','Nisha','Karan','Meena','Arun','Sita','Nikhil','Riya','Gaurav',
                      'Swati','Ajay','Divya','Manish','Tanvi','Sanjay','Preeti','Rajeev','Bhavna','Kunal'];
  const lastNames =  ['Sharma','Verma','Patel','Singh','Kumar','Joshi','Mehta','Nair','Reddy','Gupta',
                      'Iyer','Pillai','Rao','Das','Chopra','Kapoor','Bose','Shah','Mishra','Pandey',
                      'Sinha','Jain','Desai','Khanna','Malhotra','Saxena','Tiwari','Bhatt','Agarwal','Chaudhary'];
  const designations = ['Senior Agent','Team Lead','Quality Analyst','Process Expert','Senior Executive',
                        'Executive','Associate','Specialist','Coordinator','Analyst'];
  const podList = [podIds.alpha, podIds.beta, podIds.gamma, podIds.delta];
  const podMap = [...podList, ...podList, ...podList, ...podList, ...podList, ...podList, ...podList, podList[0], podList[1]];

  const empIds = Array.from({ length: 30 }, () => uuid());
  const employees = firstNames.map((fn, i) => ({
    id: empIds[i],
    employee_id: `EMP${String(i + 1).padStart(3, '0')}`,
    full_name: `${fn} ${lastNames[i]}`,
    email: `${fn.toLowerCase()}.${lastNames[i].toLowerCase()}@rosterflow.demo`,
    phone: `+91 ${9800000000 + i}`,
    designation: designations[i % designations.length],
    department: ['Operations','Quality','Support','Fulfilment'][i % 4],
    pod_id: podMap[i],
    role: i === 0 ? 'admin' : i < 3 ? 'pod_lead' : i < 7 ? 'operations_manager' : 'employee',
    employment_status: i === 28 ? 'on_leave' : i === 29 ? 'inactive' : 'active',
    weekly_off_day: i % 7,
    joining_date: dateOffset(-(365 + i * 30)),
    working_hours: 8,
    skills: i % 3 === 0 ? ['Customer Service','Excel'] : i % 3 === 1 ? ['Data Entry','Chat Support'] : ['Phone Support','CRM'],
  }));
  await upsert('employees', employees);

  // ── Holidays ───────────────────────────────────────────────────────────────
  // Note: schema uses holiday_type column (not type)
  await upsert('holidays', [
    { id: uuid(), name: 'Christmas Day',    date: '2026-12-25', holiday_type: 'national', is_national: true  },
    { id: uuid(), name: "New Year's Day",   date: '2027-01-01', holiday_type: 'national', is_national: true  },
    { id: uuid(), name: 'Republic Day',     date: '2027-01-26', holiday_type: 'national', is_national: true  },
    { id: uuid(), name: 'Holi',            date: '2027-03-01', holiday_type: 'national', is_national: false },
    { id: uuid(), name: 'Good Friday',     date: '2027-04-02', holiday_type: 'national', is_national: false },
    { id: uuid(), name: 'Independence Day',date: '2026-08-15', holiday_type: 'national', is_national: true  },
    { id: uuid(), name: 'Gandhi Jayanti',  date: '2026-10-02', holiday_type: 'national', is_national: true  },
    { id: uuid(), name: 'Diwali',          date: '2026-11-01', holiday_type: 'national', is_national: true  },
  ]);

  // ── Leave requests ─────────────────────────────────────────────────────────
  await upsert('leave_requests', [
    { id: uuid(), employee_id: empIds[5],  leave_type: 'casual', start_date: dateOffset(3),  end_date: dateOffset(5),  status: 'pending',  reason: 'Family function' },
    { id: uuid(), employee_id: empIds[8],  leave_type: 'sick',   start_date: dateOffset(-2), end_date: dateOffset(0),  status: 'approved', reason: 'Fever' },
    { id: uuid(), employee_id: empIds[12], leave_type: 'earned', start_date: dateOffset(10), end_date: dateOffset(14), status: 'pending',  reason: 'Vacation' },
    { id: uuid(), employee_id: empIds[3],  leave_type: 'casual', start_date: dateOffset(1),  end_date: dateOffset(1),  status: 'approved', reason: 'Personal work' },
    { id: uuid(), employee_id: empIds[7],  leave_type: 'sick',   start_date: dateOffset(-5), end_date: dateOffset(-4), status: 'approved', reason: 'Medical appointment' },
    { id: uuid(), employee_id: empIds[15], leave_type: 'earned', start_date: dateOffset(20), end_date: dateOffset(25), status: 'pending',  reason: 'Wedding' },
    { id: uuid(), employee_id: empIds[2],  leave_type: 'casual', start_date: dateOffset(-1), end_date: dateOffset(-1), status: 'rejected', reason: 'Personal errand' },
    { id: uuid(), employee_id: empIds[10], leave_type: 'unpaid', start_date: dateOffset(7),  end_date: dateOffset(8),  status: 'pending',  reason: 'Emergency travel' },
    { id: uuid(), employee_id: empIds[20], leave_type: 'sick',   start_date: dateOffset(-3), end_date: dateOffset(-1), status: 'approved', reason: 'Viral infection' },
    { id: uuid(), employee_id: empIds[25], leave_type: 'earned', start_date: dateOffset(30), end_date: dateOffset(35), status: 'pending',  reason: 'Annual vacation' },
  ]);

  console.log('\n✅ Seeding complete! Your RosterFlow database now has:');
  console.log('   • 4 pods (Alpha, Beta, Gamma, Delta)');
  console.log('   • 10 brands (LuxeWear, SwiftShip, NovaHealth, ...)');
  console.log('   • 12 processes');
  console.log('   • 30 employees with real Indian names');
  console.log('   • 10 leave requests & 8 holidays');
  console.log('\n🚀 Refresh your app at https://smart-roster-management-system.vercel.app');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
