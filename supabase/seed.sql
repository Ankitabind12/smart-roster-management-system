-- ============================================================
-- RosterFlow — Seed Data
-- supabase/seed.sql
-- ============================================================
-- NOTE: This seed file uses UUIDs declared as variables via
-- a DO block so references are consistent throughout the file.
-- Run this after 001_initial_schema.sql
-- ============================================================

do $$
declare
  -- ── Pods ──────────────────────────────────────────────────
  pod_alpha     uuid := gen_random_uuid();
  pod_beta      uuid := gen_random_uuid();
  pod_gamma     uuid := gen_random_uuid();
  pod_delta     uuid := gen_random_uuid();

  -- ── Brands ────────────────────────────────────────────────
  brand_glow    uuid := gen_random_uuid(); -- GlowCart
  brand_tech    uuid := gen_random_uuid(); -- TechVault
  brand_fresh   uuid := gen_random_uuid(); -- FreshMart
  brand_style   uuid := gen_random_uuid(); -- StyleHub
  brand_pets    uuid := gen_random_uuid(); -- NovaPets
  brand_craft   uuid := gen_random_uuid(); -- CraftKits
  brand_urban   uuid := gen_random_uuid(); -- UrbanEats
  brand_sky     uuid := gen_random_uuid(); -- SkyTravel
  brand_home    uuid := gen_random_uuid(); -- HomeNest
  brand_fit     uuid := gen_random_uuid(); -- FitZone

  -- ── Processes ─────────────────────────────────────────────
  -- GlowCart processes
  proc_glow_cs    uuid := gen_random_uuid();
  proc_glow_acc   uuid := gen_random_uuid();
  proc_glow_ret   uuid := gen_random_uuid();
  -- TechVault processes
  proc_tech_cs    uuid := gen_random_uuid();
  proc_tech_ndr   uuid := gen_random_uuid();
  proc_tech_acc   uuid := gen_random_uuid();
  -- FreshMart processes
  proc_fresh_cs   uuid := gen_random_uuid();
  proc_fresh_om   uuid := gen_random_uuid();
  -- StyleHub processes
  proc_style_cs   uuid := gen_random_uuid();
  proc_style_ret  uuid := gen_random_uuid();
  -- NovaPets processes
  proc_pets_cs    uuid := gen_random_uuid();
  proc_pets_ndr   uuid := gen_random_uuid();
  -- CraftKits processes
  proc_craft_cs   uuid := gen_random_uuid();
  proc_craft_acc  uuid := gen_random_uuid();
  -- UrbanEats processes
  proc_urban_cs   uuid := gen_random_uuid();
  proc_urban_om   uuid := gen_random_uuid();
  -- SkyTravel processes
  proc_sky_cs     uuid := gen_random_uuid();
  proc_sky_ret    uuid := gen_random_uuid();
  -- HomeNest processes
  proc_home_cs    uuid := gen_random_uuid();
  proc_home_om    uuid := gen_random_uuid();
  -- FitZone processes
  proc_fit_cs     uuid := gen_random_uuid();
  proc_fit_ret    uuid := gen_random_uuid();

  -- ── Employees ─────────────────────────────────────────────
  emp_01  uuid := gen_random_uuid(); -- Sarah Chen        (pod_lead Alpha)
  emp_02  uuid := gen_random_uuid(); -- Marcus Johnson    (pod_lead Beta)
  emp_03  uuid := gen_random_uuid(); -- Priya Sharma      (pod_lead Gamma)
  emp_04  uuid := gen_random_uuid(); -- James Wilson      (pod_lead Delta)
  emp_05  uuid := gen_random_uuid(); -- Aiden Brooks
  emp_06  uuid := gen_random_uuid(); -- Nisha Patel
  emp_07  uuid := gen_random_uuid(); -- Rahul Verma
  emp_08  uuid := gen_random_uuid(); -- Chloe Martin
  emp_09  uuid := gen_random_uuid(); -- Daniel Kim
  emp_10  uuid := gen_random_uuid(); -- Amara Osei
  emp_11  uuid := gen_random_uuid(); -- Lucas Ferreira
  emp_12  uuid := gen_random_uuid(); -- Sofia Russo
  emp_13  uuid := gen_random_uuid(); -- Ethan Walsh
  emp_14  uuid := gen_random_uuid(); -- Mei Lin
  emp_15  uuid := gen_random_uuid(); -- Omar Hassan
  emp_16  uuid := gen_random_uuid(); -- Leila Nouri
  emp_17  uuid := gen_random_uuid(); -- Arjun Nair
  emp_18  uuid := gen_random_uuid(); -- Gabrielle Dupont
  emp_19  uuid := gen_random_uuid(); -- Tariq Mahmood
  emp_20  uuid := gen_random_uuid(); -- Yuna Park
  emp_21  uuid := gen_random_uuid(); -- Carlos Rivera
  emp_22  uuid := gen_random_uuid(); -- Fatima Al-Rashid
  emp_23  uuid := gen_random_uuid(); -- Noah Bennett
  emp_24  uuid := gen_random_uuid(); -- Anya Kuznetsova
  emp_25  uuid := gen_random_uuid(); -- Dev Chopra
  emp_26  uuid := gen_random_uuid(); -- Isabelle Moreau
  emp_27  uuid := gen_random_uuid(); -- Ravi Shankar
  emp_28  uuid := gen_random_uuid(); -- Hannah Schmidt
  emp_29  uuid := gen_random_uuid(); -- Jason Tan
  emp_30  uuid := gen_random_uuid(); -- Zara Ahmed

  -- ── Holidays ──────────────────────────────────────────────
  hol_ny      uuid := gen_random_uuid(); -- New Year's Day
  hol_rep     uuid := gen_random_uuid(); -- Republic Day
  hol_holi    uuid := gen_random_uuid(); -- Holi
  hol_indep   uuid := gen_random_uuid(); -- Independence Day
  hol_gandhi  uuid := gen_random_uuid(); -- Gandhi Jayanti
  hol_diwali  uuid := gen_random_uuid(); -- Diwali
  hol_xmas    uuid := gen_random_uuid(); -- Christmas
  hol_eid     uuid := gen_random_uuid(); -- Eid ul-Fitr

  -- ── Roster Periods ────────────────────────────────────────
  roster_nov  uuid := gen_random_uuid(); -- Nov 2026
  roster_dec  uuid := gen_random_uuid(); -- Dec 2026

  -- ── Leave Requests ────────────────────────────────────────
  leave_01  uuid := gen_random_uuid();
  leave_02  uuid := gen_random_uuid();
  leave_03  uuid := gen_random_uuid();
  leave_04  uuid := gen_random_uuid();
  leave_05  uuid := gen_random_uuid();
  leave_06  uuid := gen_random_uuid();

  -- ── Tasks ─────────────────────────────────────────────────
  task_01  uuid := gen_random_uuid();
  task_02  uuid := gen_random_uuid();
  task_03  uuid := gen_random_uuid();
  task_04  uuid := gen_random_uuid();
  task_05  uuid := gen_random_uuid();
  task_06  uuid := gen_random_uuid();
  task_07  uuid := gen_random_uuid();
  task_08  uuid := gen_random_uuid();
  task_09  uuid := gen_random_uuid();
  task_10  uuid := gen_random_uuid();
  task_11  uuid := gen_random_uuid();
  task_12  uuid := gen_random_uuid();

  -- ── App Settings / Conflicts ───────────────────────────────
  conflict_01  uuid := gen_random_uuid();
  conflict_02  uuid := gen_random_uuid();
  conflict_03  uuid := gen_random_uuid();

begin

  -- ═══════════════════════════════════════════════════════════
  -- PODS
  -- ═══════════════════════════════════════════════════════════
  insert into pods (id, pod_name, pod_code, description, status)
  values
    (pod_alpha, 'Alpha Squad',  'ALPHA', 'Primary customer success pod handling beauty and wellness brands', 'active'),
    (pod_beta,  'Beta Force',   'BETA',  'Electronics and technology focused operations team', 'active'),
    (pod_gamma, 'Gamma Team',   'GAMMA', 'Grocery, food delivery, and FMCG brand support team', 'active'),
    (pod_delta, 'Delta Unit',   'DELTA', 'Lifestyle, fitness, and travel brand operations unit', 'active')
  on conflict (pod_code) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- BRANDS
  -- ═══════════════════════════════════════════════════════════
  insert into brands (id, brand_name, brand_code, description, operates_365, operates_on_sundays, operates_on_holidays, min_daily_staff)
  values
    -- Scenario A: 365-day, single-resource CS
    (brand_glow,  'GlowCart',  'GLOW',  'Premium beauty and skincare e-commerce brand',               true,  true,  true,  1),
    -- Scenario B: 3 employees, different processes
    (brand_tech,  'TechVault', 'TECH',  'Consumer electronics and gadgets marketplace',               false, true,  false, 3),
    -- Scenario C: CS requires 2 employees daily
    (brand_fresh, 'FreshMart', 'FRESH', 'Online grocery delivery platform',                           false, true,  false, 2),
    -- Scenario E: No Sunday operation
    (brand_style, 'StyleHub',  'STYLE', 'Fashion and apparel direct-to-consumer brand',               false, false, false, 1),
    -- Scenario F: 365-day pet care
    (brand_pets,  'NovaPets',  'PETS',  '365-day pet care and supplies subscription service',         true,  true,  true,  2),
    -- Scenario G: Multiple employees on same process
    (brand_craft, 'CraftKits', 'CRAFT', 'DIY craft kits and hobby supplies brand',                   false, true,  false, 2),
    (brand_urban, 'UrbanEats', 'URBAN', 'Cloud kitchen food delivery aggregator',                     false, true,  false, 2),
    (brand_sky,   'SkyTravel', 'SKY',   'Online travel agency specialising in domestic packages',     false, true,  false, 1),
    (brand_home,  'HomeNest',  'HOME',  'Home decor and furniture e-commerce platform',               false, false, false, 1),
    (brand_fit,   'FitZone',   'FIT',   'Online fitness coaching and supplement brand',               false, true,  false, 1)
  on conflict (brand_code) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- PROCESSES
  -- ═══════════════════════════════════════════════════════════
  insert into processes (id, name, code, description, brand_id, process_type, min_daily_staff, operates_on_sundays, operates_on_holidays)
  values
    -- GlowCart
    (proc_glow_cs,  'GlowCart CS',        'GLOW-CS',   'Customer support — chat/email for GlowCart',          brand_glow,  'cs',               1, true,  true),
    (proc_glow_acc, 'GlowCart Account',   'GLOW-ACC',  'Account management for GlowCart sellers',             brand_glow,  'acc',              1, false, false),
    (proc_glow_ret, 'GlowCart Retention', 'GLOW-RET',  'Customer retention and win-back for GlowCart',        brand_glow,  'retention',        1, false, false),
    -- TechVault
    (proc_tech_cs,  'TechVault CS',       'TECH-CS',   'Technical support and CS for TechVault',              brand_tech,  'cs',               1, true,  false),
    (proc_tech_ndr, 'TechVault NDR',      'TECH-NDR',  'Non-delivery resolution for TechVault orders',        brand_tech,  'ndr',              1, true,  false),
    (proc_tech_acc, 'TechVault Account',  'TECH-ACC',  'Seller account management for TechVault',             brand_tech,  'acc',              1, false, false),
    -- FreshMart
    (proc_fresh_cs, 'FreshMart CS',       'FRESH-CS',  'Customer support for FreshMart grocery orders',       brand_fresh, 'cs',               2, true,  false),
    (proc_fresh_om, 'FreshMart OM',       'FRESH-OM',  'Order management and dispatch coordination',          brand_fresh, 'order_management', 1, true,  false),
    -- StyleHub
    (proc_style_cs, 'StyleHub CS',        'STYLE-CS',  'Customer support for StyleHub (Mon-Sat)',             brand_style, 'cs',               1, false, false),
    (proc_style_ret,'StyleHub Retention', 'STYLE-RET', 'Returns and retention handling for StyleHub',         brand_style, 'retention',        1, false, false),
    -- NovaPets
    (proc_pets_cs,  'NovaPets CS',        'PETS-CS',   '24x7 pet care customer support',                      brand_pets,  'cs',               2, true,  true),
    (proc_pets_ndr, 'NovaPets NDR',       'PETS-NDR',  'Non-delivery and subscription issue resolution',      brand_pets,  'ndr',              1, true,  true),
    -- CraftKits
    (proc_craft_cs, 'CraftKits CS',       'CRAFT-CS',  'Customer support for CraftKits orders',               brand_craft, 'cs',               2, true,  false),
    (proc_craft_acc,'CraftKits Account',  'CRAFT-ACC', 'Vendor account management for CraftKits',             brand_craft, 'acc',              1, false, false),
    -- UrbanEats
    (proc_urban_cs, 'UrbanEats CS',       'URBAN-CS',  'Customer support for UrbanEats delivery queries',     brand_urban, 'cs',               1, true,  false),
    (proc_urban_om, 'UrbanEats OM',       'URBAN-OM',  'Order management and rider coordination',             brand_urban, 'order_management', 1, true,  false),
    -- SkyTravel
    (proc_sky_cs,   'SkyTravel CS',       'SKY-CS',    'Customer support for travel bookings',                brand_sky,   'cs',               1, true,  false),
    (proc_sky_ret,  'SkyTravel Retention','SKY-RET',   'Cancellation handling and retention for SkyTravel',   brand_sky,   'retention',        1, false, false),
    -- HomeNest
    (proc_home_cs,  'HomeNest CS',        'HOME-CS',   'Customer support for HomeNest (Mon-Sat)',             brand_home,  'cs',               1, false, false),
    (proc_home_om,  'HomeNest OM',        'HOME-OM',   'Order management for HomeNest deliveries',            brand_home,  'order_management', 1, false, false),
    -- FitZone
    (proc_fit_cs,   'FitZone CS',         'FIT-CS',    'Customer support for FitZone subscribers',            brand_fit,   'cs',               1, true,  false),
    (proc_fit_ret,  'FitZone Retention',  'FIT-RET',   'Subscriber retention and upsell for FitZone',        brand_fit,   'retention',        1, false, false)
  on conflict (code) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- EMPLOYEES  (pod leads first so we can back-ref)
  -- weekly_off_day: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  -- ═══════════════════════════════════════════════════════════
  insert into employees (id, employee_id, full_name, email, phone, designation, role, department, pod_id, joining_date, employment_status, weekly_off_day, secondary_weekly_off_day, working_hours, skills)
  values
    -- Pod Leads
    (emp_01, 'EMP-001', 'Sarah Chen',       'sarah.chen@rosterflow.demo',       '+91-9800000001', 'Pod Lead',         'pod_lead',          'Operations', pod_alpha, '2022-01-15', 'active', 0, null, 8.0, ARRAY['customer_success','team_lead','analytics']),
    (emp_02, 'EMP-002', 'Marcus Johnson',   'marcus.johnson@rosterflow.demo',   '+91-9800000002', 'Pod Lead',         'pod_lead',          'Operations', pod_beta,  '2022-02-01', 'active', 0, null, 8.0, ARRAY['tech_support','team_lead','escalations']),
    (emp_03, 'EMP-003', 'Priya Sharma',     'priya.sharma@rosterflow.demo',     '+91-9800000003', 'Pod Lead',         'pod_lead',          'Operations', pod_gamma, '2022-03-10', 'active', 0, null, 8.0, ARRAY['order_management','team_lead','coordination']),
    (emp_04, 'EMP-004', 'James Wilson',     'james.wilson@rosterflow.demo',     '+91-9800000004', 'Pod Lead',         'pod_lead',          'Operations', pod_delta, '2022-04-05', 'active', 0, null, 8.0, ARRAY['retention','team_lead','crm']),
    -- Alpha Squad employees
    (emp_05, 'EMP-005', 'Aiden Brooks',     'aiden.brooks@rosterflow.demo',     '+91-9800000005', 'Senior CS Agent',  'employee',          'Operations', pod_alpha, '2022-06-01', 'active', 1, null, 8.0, ARRAY['customer_success','upselling']),
    (emp_06, 'EMP-006', 'Nisha Patel',      'nisha.patel@rosterflow.demo',      '+91-9800000006', 'CS Agent',         'employee',          'Operations', pod_alpha, '2022-07-15', 'active', 2, null, 8.0, ARRAY['customer_success','retention']),
    (emp_07, 'EMP-007', 'Rahul Verma',      'rahul.verma@rosterflow.demo',      '+91-9800000007', 'CS Agent',         'employee',          'Operations', pod_alpha, '2022-08-20', 'active', 3, null, 8.0, ARRAY['customer_success','ndr']),
    (emp_08, 'EMP-008', 'Chloe Martin',     'chloe.martin@rosterflow.demo',     '+91-9800000008', 'Account Manager',  'employee',          'Operations', pod_alpha, '2022-09-01', 'active', 4, null, 8.0, ARRAY['account_management','analytics']),
    (emp_09, 'EMP-009', 'Daniel Kim',       'daniel.kim@rosterflow.demo',       '+91-9800000009', 'CS Agent',         'employee',          'Operations', pod_alpha, '2022-10-10', 'active', 5, null, 8.0, ARRAY['customer_success','chat_support']),
    (emp_10, 'EMP-010', 'Amara Osei',       'amara.osei@rosterflow.demo',       '+91-9800000010', 'CS Agent',         'employee',          'Operations', pod_alpha, '2022-11-01', 'active', 6, null, 8.0, ARRAY['customer_success','email_support']),
    (emp_11, 'EMP-011', 'Lucas Ferreira',   'lucas.ferreira@rosterflow.demo',   '+91-9800000011', 'Retention Agent',  'employee',          'Operations', pod_alpha, '2023-01-10', 'active', 0, null, 8.0, ARRAY['retention','customer_success']),
    (emp_12, 'EMP-012', 'Sofia Russo',      'sofia.russo@rosterflow.demo',      '+91-9800000012', 'CS Agent',         'employee',          'Operations', pod_alpha, '2023-02-15', 'active', 1, null, 8.0, ARRAY['customer_success','ndr']),
    -- Beta Force employees
    (emp_13, 'EMP-013', 'Ethan Walsh',      'ethan.walsh@rosterflow.demo',      '+91-9800000013', 'Tech Support Lead','employee',          'Operations', pod_beta,  '2022-05-20', 'active', 2, null, 8.0, ARRAY['tech_support','escalations','ndr']),
    (emp_14, 'EMP-014', 'Mei Lin',          'mei.lin@rosterflow.demo',          '+91-9800000014', 'CS Agent',         'employee',          'Operations', pod_beta,  '2022-07-01', 'active', 3, null, 8.0, ARRAY['customer_success','chat_support']),
    (emp_15, 'EMP-015', 'Omar Hassan',      'omar.hassan@rosterflow.demo',      '+91-9800000015', 'NDR Specialist',   'employee',          'Operations', pod_beta,  '2022-08-15', 'active', 4, null, 8.0, ARRAY['ndr','logistics','escalations']),
    (emp_16, 'EMP-016', 'Leila Nouri',      'leila.nouri@rosterflow.demo',      '+91-9800000016', 'Account Manager',  'employee',          'Operations', pod_beta,  '2022-10-01', 'active', 5, null, 8.0, ARRAY['account_management','crm']),
    (emp_17, 'EMP-017', 'Arjun Nair',       'arjun.nair@rosterflow.demo',       '+91-9800000017', 'CS Agent',         'employee',          'Operations', pod_beta,  '2023-01-05', 'active', 6, null, 8.0, ARRAY['customer_success','tech_support']),
    (emp_18, 'EMP-018', 'Gabrielle Dupont', 'gabrielle.dupont@rosterflow.demo', '+91-9800000018', 'CS Agent',         'employee',          'Operations', pod_beta,  '2023-03-01', 'active', 0, null, 8.0, ARRAY['customer_success','email_support']),
    -- Gamma Team employees
    (emp_19, 'EMP-019', 'Tariq Mahmood',    'tariq.mahmood@rosterflow.demo',    '+91-9800000019', 'CS Agent',         'employee',          'Operations', pod_gamma, '2022-06-15', 'active', 1, null, 8.0, ARRAY['customer_success','order_management']),
    (emp_20, 'EMP-020', 'Yuna Park',        'yuna.park@rosterflow.demo',        '+91-9800000020', 'OM Specialist',    'employee',          'Operations', pod_gamma, '2022-08-01', 'active', 2, null, 8.0, ARRAY['order_management','logistics','coordination']),
    (emp_21, 'EMP-021', 'Carlos Rivera',    'carlos.rivera@rosterflow.demo',    '+91-9800000021', 'CS Agent',         'employee',          'Operations', pod_gamma, '2022-09-10', 'active', 3, null, 8.0, ARRAY['customer_success','chat_support']),
    (emp_22, 'EMP-022', 'Fatima Al-Rashid', 'fatima.alrashid@rosterflow.demo',  '+91-9800000022', 'CS Agent',         'employee',          'Operations', pod_gamma, '2022-11-20', 'active', 4, null, 8.0, ARRAY['customer_success','retention']),
    (emp_23, 'EMP-023', 'Noah Bennett',     'noah.bennett@rosterflow.demo',     '+91-9800000023', 'CS Agent',         'employee',          'Operations', pod_gamma, '2023-01-20', 'active', 5, null, 8.0, ARRAY['customer_success','ndr']),
    (emp_24, 'EMP-024', 'Anya Kuznetsova',  'anya.kuznetsova@rosterflow.demo',  '+91-9800000024', 'OM Specialist',    'employee',          'Operations', pod_gamma, '2023-02-10', 'active', 6, null, 8.0, ARRAY['order_management','analytics']),
    -- Delta Unit employees
    (emp_25, 'EMP-025', 'Dev Chopra',       'dev.chopra@rosterflow.demo',       '+91-9800000025', 'Retention Agent',  'employee',          'Operations', pod_delta, '2022-05-01', 'active', 0, null, 8.0, ARRAY['retention','crm','upselling']),
    (emp_26, 'EMP-026', 'Isabelle Moreau',  'isabelle.moreau@rosterflow.demo',  '+91-9800000026', 'CS Agent',         'employee',          'Operations', pod_delta, '2022-07-20', 'active', 1, null, 8.0, ARRAY['customer_success','travel','bookings']),
    (emp_27, 'EMP-027', 'Ravi Shankar',     'ravi.shankar@rosterflow.demo',     '+91-9800000027', 'CS Agent',         'employee',          'Operations', pod_delta, '2022-09-05', 'active', 2, null, 8.0, ARRAY['customer_success','fitness','retention']),
    (emp_28, 'EMP-028', 'Hannah Schmidt',   'hannah.schmidt@rosterflow.demo',   '+91-9800000028', 'Account Manager',  'employee',          'Operations', pod_delta, '2022-10-15', 'active', 3, null, 8.0, ARRAY['account_management','analytics','crm']),
    (emp_29, 'EMP-029', 'Jason Tan',        'jason.tan@rosterflow.demo',        '+91-9800000029', 'CS Agent',         'employee',          'Operations', pod_delta, '2023-01-15', 'active', 4, null, 8.0, ARRAY['customer_success','chat_support']),
    (emp_30, 'EMP-030', 'Zara Ahmed',       'zara.ahmed@rosterflow.demo',       '+91-9800000030', 'CS Agent',         'employee',          'Operations', pod_delta, '2023-04-01', 'active', 5, null, 8.0, ARRAY['customer_success','email_support','retention'])
  on conflict (employee_id) do nothing;

  -- Back-fill pod lead references now that employees exist
  update pods set pod_lead_id = emp_01 where id = pod_alpha;
  update pods set pod_lead_id = emp_02 where id = pod_beta;
  update pods set pod_lead_id = emp_03 where id = pod_gamma;
  update pods set pod_lead_id = emp_04 where id = pod_delta;

  -- ═══════════════════════════════════════════════════════════
  -- POD → BRAND ASSIGNMENTS
  -- ═══════════════════════════════════════════════════════════
  insert into pod_brand_assignments (pod_id, brand_id)
  values
    (pod_alpha, brand_glow),
    (pod_alpha, brand_pets),
    (pod_beta,  brand_tech),
    (pod_beta,  brand_craft),
    (pod_gamma, brand_fresh),
    (pod_gamma, brand_urban),
    (pod_delta, brand_style),
    (pod_delta, brand_sky),
    (pod_delta, brand_fit),
    (pod_delta, brand_home)
  on conflict (pod_id, brand_id) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- EMPLOYEE → BRAND ASSIGNMENTS
  -- ═══════════════════════════════════════════════════════════
  insert into employee_brand_assignments (employee_id, brand_id, is_primary)
  values
    -- Alpha Squad → GlowCart (Scenario A: single-resource)
    (emp_01, brand_glow,  true),   -- Sarah Chen (pod lead)
    (emp_05, brand_glow,  true),   -- Aiden Brooks  (primary)
    (emp_06, brand_glow,  true),   -- Nisha Patel   (primary)
    (emp_07, brand_glow,  true),   -- Rahul Verma   (primary)
    (emp_08, brand_glow,  false),  -- Chloe Martin  (secondary; also NovaPets)
    (emp_09, brand_glow,  true),   -- Daniel Kim
    (emp_10, brand_glow,  true),   -- Amara Osei
    (emp_11, brand_glow,  false),  -- Lucas Ferreira
    (emp_12, brand_glow,  true),   -- Sofia Russo
    -- Alpha → NovaPets (365, Scenario F)
    (emp_08, brand_pets,  true),   -- Chloe Martin  (also GlowCart)
    (emp_11, brand_pets,  true),   -- Lucas Ferreira
    -- Beta Force → TechVault (Scenario B: 3 employees, different processes)
    (emp_02, brand_tech,  true),
    (emp_13, brand_tech,  true),   -- Ethan Walsh   (CS)
    (emp_14, brand_tech,  true),   -- Mei Lin       (CS)
    (emp_15, brand_tech,  true),   -- Omar Hassan   (NDR)
    (emp_16, brand_tech,  false),  -- Leila Nouri   (ACC; secondary)
    (emp_17, brand_tech,  true),   -- Arjun Nair
    -- Beta → CraftKits (Scenario G: multiple employees same process)
    (emp_16, brand_craft, true),   -- Leila Nouri   (also TechVault)
    (emp_17, brand_craft, false),  -- Arjun Nair    (also TechVault)
    (emp_18, brand_craft, true),   -- Gabrielle Dupont
    -- Gamma Team → FreshMart (Scenario C: 2 employees CS daily)
    (emp_03, brand_fresh, true),
    (emp_19, brand_fresh, true),   -- Tariq Mahmood
    (emp_20, brand_fresh, true),   -- Yuna Park
    (emp_21, brand_fresh, true),   -- Carlos Rivera
    (emp_22, brand_fresh, false),  -- Fatima (secondary; also UrbanEats)
    -- Gamma → UrbanEats
    (emp_22, brand_urban, true),   -- Fatima
    (emp_23, brand_urban, true),   -- Noah Bennett
    (emp_24, brand_urban, false),  -- Anya Kuznetsova
    -- Delta Unit → StyleHub (Scenario E: no Sunday)
    (emp_04, brand_style, true),
    (emp_25, brand_style, false),  -- Dev Chopra (secondary)
    (emp_26, brand_style, true),   -- Isabelle Moreau
    -- Delta → SkyTravel
    (emp_26, brand_sky,   false),  -- Isabelle (secondary)
    (emp_27, brand_sky,   true),   -- Ravi Shankar
    -- Delta → FitZone
    (emp_27, brand_fit,   false),  -- Ravi (secondary)
    (emp_28, brand_fit,   true),   -- Hannah Schmidt
    (emp_29, brand_fit,   true),   -- Jason Tan
    (emp_30, brand_fit,   true),   -- Zara Ahmed
    -- Delta → HomeNest
    (emp_25, brand_home,  true),   -- Dev Chopra
    (emp_28, brand_home,  false),  -- Hannah Schmidt (secondary)
    (emp_29, brand_home,  false),  -- Jason Tan (secondary)
    (emp_30, brand_home,  false)   -- Zara Ahmed (secondary)
  on conflict (employee_id, brand_id) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- EMPLOYEE → PROCESS ASSIGNMENTS
  -- ═══════════════════════════════════════════════════════════
  insert into employee_process_assignments (employee_id, process_id, is_primary)
  values
    -- Alpha / GlowCart — Scenario A (single resource emp_05 on CS)
    (emp_05, proc_glow_cs,  true),
    (emp_06, proc_glow_cs,  true),
    (emp_07, proc_glow_cs,  true),
    (emp_09, proc_glow_cs,  true),
    (emp_10, proc_glow_cs,  true),
    (emp_12, proc_glow_cs,  true),
    (emp_08, proc_glow_acc, true),
    (emp_11, proc_glow_ret, true),
    -- Beta / TechVault — Scenario B (3 employees, different processes)
    (emp_13, proc_tech_cs,  true),
    (emp_14, proc_tech_cs,  true),
    (emp_17, proc_tech_cs,  false),
    (emp_15, proc_tech_ndr, true),
    (emp_16, proc_tech_acc, true),
    -- Beta / CraftKits — Scenario G (multiple employees on same CS process)
    (emp_16, proc_craft_cs,  false),  -- also on TechVault ACC
    (emp_17, proc_craft_cs,  false),  -- also on TechVault CS
    (emp_18, proc_craft_cs,  true),
    (emp_16, proc_craft_acc, false),
    -- Gamma / FreshMart — Scenario C (CS needs 2 daily)
    (emp_19, proc_fresh_cs, true),
    (emp_21, proc_fresh_cs, true),
    (emp_22, proc_fresh_cs, false),
    (emp_20, proc_fresh_om, true),
    (emp_24, proc_fresh_om, false),
    -- Gamma / UrbanEats
    (emp_22, proc_urban_cs, true),
    (emp_23, proc_urban_cs, true),
    (emp_24, proc_urban_om, true),
    -- Delta / StyleHub — Scenario E (no Sunday)
    (emp_26, proc_style_cs,  true),
    (emp_25, proc_style_ret, true),
    -- Delta / SkyTravel
    (emp_27, proc_sky_cs,  true),
    (emp_26, proc_sky_cs,  false),
    (emp_28, proc_sky_ret, false),
    -- Delta / FitZone
    (emp_27, proc_fit_ret, true),
    (emp_28, proc_fit_cs,  true),
    (emp_29, proc_fit_cs,  true),
    (emp_30, proc_fit_cs,  true),
    (emp_30, proc_fit_ret, false),
    -- Delta / HomeNest
    (emp_25, proc_home_cs, true),
    (emp_29, proc_home_om, true),
    -- Alpha / NovaPets
    (emp_08, proc_pets_cs,  true),
    (emp_11, proc_pets_cs,  true),
    (emp_11, proc_pets_ndr, false)
  on conflict (employee_id, process_id) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- HOLIDAYS (2026)
  -- ═══════════════════════════════════════════════════════════
  insert into holidays (id, name, date, holiday_type, description, is_national)
  values
    (hol_ny,     'New Year''s Day',      '2026-01-01', 'national',  'First day of the new year',                   true),
    (hol_rep,    'Republic Day',         '2026-01-26', 'national',  'India Republic Day — national holiday',       true),
    (hol_holi,   'Holi',                '2026-03-03', 'national',  'Festival of colours',                         true),
    (hol_indep,  'Independence Day',     '2026-08-15', 'national',  'India Independence Day',                      true),
    (hol_gandhi, 'Gandhi Jayanti',       '2026-10-02', 'national',  'Birthday of Mahatma Gandhi',                  true),
    (hol_diwali, 'Diwali',              '2026-10-20', 'national',  'Festival of lights',                          true),
    (hol_xmas,   'Christmas Day',        '2026-12-25', 'national',  'Christmas — birth of Jesus Christ',           true),
    (hol_eid,    'Eid ul-Fitr',         '2026-03-30', 'national',  'End of Ramadan — subject to moon sighting',   true)
  on conflict (date) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- BRAND HOLIDAY RULES
  -- 365-day brands operate on all holidays; others may differ
  -- ═══════════════════════════════════════════════════════════
  insert into brand_holiday_rules (brand_id, holiday_id, is_operational)
  values
    -- GlowCart: 365 — operational on all
    (brand_glow, hol_ny,     true),
    (brand_glow, hol_rep,    true),
    (brand_glow, hol_holi,   true),
    (brand_glow, hol_indep,  true),
    (brand_glow, hol_gandhi, true),
    (brand_glow, hol_diwali, true),
    (brand_glow, hol_xmas,   true),
    (brand_glow, hol_eid,    true),
    -- NovaPets: 365 — operational on all
    (brand_pets, hol_ny,     true),
    (brand_pets, hol_rep,    true),
    (brand_pets, hol_holi,   true),
    (brand_pets, hol_indep,  true),
    (brand_pets, hol_gandhi, true),
    (brand_pets, hol_diwali, true),
    (brand_pets, hol_xmas,   true),
    (brand_pets, hol_eid,    true),
    -- TechVault: not operational on national holidays
    (brand_tech, hol_ny,     false),
    (brand_tech, hol_rep,    false),
    (brand_tech, hol_indep,  false),
    (brand_tech, hol_diwali, false),
    (brand_tech, hol_xmas,   false),
    -- FreshMart: operational on most holidays (grocery)
    (brand_fresh, hol_ny,     true),
    (brand_fresh, hol_indep,  true),
    (brand_fresh, hol_diwali, false),
    (brand_fresh, hol_xmas,   false)
  on conflict (brand_id, holiday_id) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- ROSTER PERIODS
  -- ═══════════════════════════════════════════════════════════
  insert into roster_periods (id, month, year, status, generated_at, published_at)
  values
    (roster_nov, 11, 2026, 'published', now() - interval '5 days', now() - interval '3 days'),
    (roster_dec, 12, 2026, 'draft',     now(),                      null)
  on conflict (month, year) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- LEAVE REQUESTS
  -- ═══════════════════════════════════════════════════════════
  insert into leave_requests (id, employee_id, leave_type, start_date, end_date, reason, status, review_notes, submitted_at, reviewed_at)
  values
    -- Approved leave (creates coverage gap for GlowCart CS)
    (leave_01, emp_05, 'casual',  '2026-11-24', '2026-11-25', 'Personal commitment — family event',       'approved', 'Approved; ensure CS coverage for Mon-Tue',   now() - interval '8 days', now() - interval '6 days'),
    -- Sick leave approved
    (leave_02, emp_14, 'sick',    '2026-11-27', '2026-11-28', 'Viral fever, doctor advised rest',         'approved', 'Medical leave approved per policy',          now() - interval '5 days', now() - interval '4 days'),
    -- Pending leave — could create conflict
    (leave_03, emp_19, 'earned',  '2026-12-01', '2026-12-05', 'Annual vacation — family trip',            'pending',  null,                                         now() - interval '2 days', null),
    -- Rejected leave
    (leave_04, emp_22, 'casual',  '2026-11-30', '2026-11-30', 'Half-day needed for personal errand',      'rejected', 'Short notice; overlap with FreshMart peak',  now() - interval '3 days', now() - interval '1 day'),
    -- Approved leave creating coverage gap for NovaPets
    (leave_05, emp_08, 'earned',  '2026-12-08', '2026-12-12', 'Pre-booked holiday trip',                  'approved', 'Approved; check NovaPets CS coverage',       now() - interval '10 days',now() - interval '7 days'),
    -- Cancelled leave
    (leave_06, emp_27, 'casual',  '2026-11-28', '2026-11-28', 'Needed day off for home shifting',         'cancelled','Cancelled by employee',                      now() - interval '4 days', now() - interval '2 days')
  on conflict do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- COMP OFFS
  -- ═══════════════════════════════════════════════════════════
  insert into comp_offs (employee_id, earned_date, assigned_date, reason, status, notes)
  values
    (emp_05, '2026-11-01', '2026-11-29', 'Worked on Diwali for GlowCart',      'assigned', 'Carry-forward approved by pod lead'),
    (emp_09, '2026-10-02', null,          'Worked Gandhi Jayanti for GlowCart', 'earned',   null),
    (emp_15, '2026-11-01', '2026-11-28', 'Worked Diwali weekend, TechVault NDR','assigned', null),
    (emp_08, '2026-11-01', '2026-12-10', 'Worked Diwali for NovaPets',          'assigned', 'Scheduled during approved leave period')
  on conflict do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- SAMPLE ROSTER ENTRIES (November 2026 — a few sample dates)
  -- ═══════════════════════════════════════════════════════════
  insert into roster_entries (roster_period_id, employee_id, date, schedule_status, brand_id, process_id, notes)
  values
    -- 2026-11-20 (Friday) — normal working day
    (roster_nov, emp_05, '2026-11-20', 'working',     brand_glow,  proc_glow_cs,  null),
    (roster_nov, emp_06, '2026-11-20', 'working',     brand_glow,  proc_glow_cs,  null),
    (roster_nov, emp_07, '2026-11-20', 'working',     brand_glow,  proc_glow_cs,  null),
    (roster_nov, emp_08, '2026-11-20', 'working',     brand_glow,  proc_glow_acc, null),
    (roster_nov, emp_11, '2026-11-20', 'working',     brand_pets,  proc_pets_cs,  null),
    (roster_nov, emp_13, '2026-11-20', 'working',     brand_tech,  proc_tech_cs,  null),
    (roster_nov, emp_14, '2026-11-20', 'working',     brand_tech,  proc_tech_cs,  null),
    (roster_nov, emp_15, '2026-11-20', 'working',     brand_tech,  proc_tech_ndr, null),
    (roster_nov, emp_19, '2026-11-20', 'working',     brand_fresh, proc_fresh_cs, null),
    (roster_nov, emp_21, '2026-11-20', 'working',     brand_fresh, proc_fresh_cs, null),
    -- 2026-11-22 (Sunday) — weekly offs / no Sunday brands off
    (roster_nov, emp_01, '2026-11-22', 'weekly_off',  null,        null,          'Pod Lead Sunday off'),
    (roster_nov, emp_26, '2026-11-22', 'weekly_off',  null,        null,          'StyleHub closed Sundays'),
    -- 2026-11-24 (Monday) — emp_05 on approved leave (gap!)
    (roster_nov, emp_05, '2026-11-24', 'leave',       null,        null,          'Casual leave approved'),
    (roster_nov, emp_06, '2026-11-24', 'working',     brand_glow,  proc_glow_cs,  null),
    (roster_nov, emp_07, '2026-11-24', 'working',     brand_glow,  proc_glow_cs,  null),
    -- 2026-11-27 (Thursday) — emp_14 on sick leave
    (roster_nov, emp_14, '2026-11-27', 'leave',       null,        null,          'Sick leave — viral fever')
  on conflict (roster_period_id, employee_id, date) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- SCHEDULING CONFLICTS
  -- ═══════════════════════════════════════════════════════════
  insert into scheduling_conflicts (id, roster_period_id, employee_id, brand_id, process_id, conflict_date, severity, title, description, suggested_action, is_resolved)
  values
    (conflict_01, roster_nov, emp_05, brand_glow, proc_glow_cs, '2026-11-24', 'warning',
     'GlowCart CS — below minimum staff on 24 Nov',
     'Only 2 agents scheduled for GlowCart CS on 2026-11-24 (EMP-005 on leave). Minimum required: 3.',
     'Assign a backup agent (EMP-012 Sofia Russo) or request voluntary coverage from EMP-009.',
     false),
    (conflict_02, roster_nov, emp_14, brand_tech, proc_tech_cs, '2026-11-27', 'warning',
     'TechVault CS — coverage gap on 27 Nov',
     'EMP-014 Mei Lin on sick leave. TechVault CS only has 1 confirmed agent (EMP-013 Ethan Walsh).',
     'Assign EMP-017 Arjun Nair to TechVault CS as backup for 27 Nov.',
     false),
    (conflict_03, roster_dec, emp_08, brand_pets, proc_pets_cs, '2026-12-08', 'critical',
     'NovaPets CS — critical coverage gap 8-12 Dec',
     'EMP-008 Chloe Martin on approved leave Dec 8-12. NovaPets is a 365-day brand requiring minimum 2 CS agents. Only EMP-011 Lucas Ferreira remains.',
     'Assign cross-trained agent from Alpha Squad or arrange overtime coverage for the leave period.',
     false)
  on conflict do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- TASKS (12 tasks — various priorities and statuses)
  -- ═══════════════════════════════════════════════════════════
  insert into tasks (id, title, description, assigned_to, assigned_by, brand_id, process_id, priority, status, start_date, due_date, completed_at)
  values
    (task_01, 'Audit GlowCart CS SLA compliance for October',
     'Review all October CS tickets for GlowCart. Check first response time, resolution time, and CSAT scores. Prepare summary report.',
     emp_05, emp_01, brand_glow, proc_glow_cs, 'high', 'in_progress',
     '2026-11-15', '2026-11-25', null),

    (task_02, 'Update TechVault NDR tracker — weekly sweep',
     'Review all pending NDR cases older than 7 days for TechVault. Escalate stuck cases to logistics partner.',
     emp_15, emp_02, brand_tech, proc_tech_ndr, 'urgent', 'assigned',
     '2026-11-22', '2026-11-23', null),

    (task_03, 'Onboard 2 new FreshMart CS agents to process wiki',
     'Walk new joiners through FreshMart CS standard operating procedures, tools, and escalation matrix.',
     emp_19, emp_03, brand_fresh, proc_fresh_cs, 'medium', 'completed',
     '2026-11-10', '2026-11-14', '2026-11-13 11:30:00+00'),

    (task_04, 'Prepare December roster schedule for GlowCart',
     'Draft December 2026 roster ensuring 365-day coverage for GlowCart CS, ACC and Retention processes. Identify coverage gaps early.',
     emp_01, emp_01, brand_glow, null, 'high', 'in_progress',
     '2026-11-20', '2026-11-28', null),

    (task_05, 'StyleHub Retention — Q4 campaign response follow-up',
     'Follow up on all Q4 campaign customers who initiated returns. Apply retention scripts and log outcomes in CRM.',
     emp_25, emp_04, brand_style, proc_style_ret, 'medium', 'in_progress',
     '2026-11-18', '2026-11-30', null),

    (task_06, 'Fix duplicate ticket issue in NovaPets CS queue',
     'Customers are receiving duplicate acknowledgement emails for NovaPets CS tickets. Investigate root cause and coordinate with tech team.',
     emp_08, emp_01, brand_pets, proc_pets_cs, 'urgent', 'assigned',
     '2026-11-21', '2026-11-22', null),

    (task_07, 'CraftKits ACC — update seller onboarding deck',
     'Refresh the seller onboarding presentation for CraftKits with updated commission structure and new portal screenshots.',
     emp_16, emp_02, brand_craft, proc_craft_acc, 'low', 'assigned',
     '2026-11-22', '2026-12-05', null),

    (task_08, 'UrbanEats OM — reconcile missing order reports for week 46',
     'Reconcile Week 46 order fulfilment data with partner kitchens. Identify undelivered orders and initiate refund workflow.',
     emp_24, emp_03, brand_urban, proc_urban_om, 'high', 'overdue',
     '2026-11-10', '2026-11-17', null),

    (task_09, 'SkyTravel CS — Q4 surge preparation checklist',
     'Prepare and circulate a surge readiness checklist for the Dec-Jan holiday travel peak. Include escalation paths and emergency contacts.',
     emp_27, emp_04, brand_sky, proc_sky_cs, 'medium', 'assigned',
     '2026-11-22', '2026-11-30', null),

    (task_10, 'FitZone Retention — analyse churn data for November',
     'Pull November churn data, segment by tenure and reason. Build a heatmap and present to Delta Unit in Friday standup.',
     emp_28, emp_04, brand_fit, proc_fit_ret, 'medium', 'in_progress',
     '2026-11-18', '2026-11-28', null),

    (task_11, 'HomeNest CS — resolve backlog from Diwali week',
     'Clear 90+ unresolved tickets accumulated during Diwali week when HomeNest CS was at reduced staffing.',
     emp_25, emp_04, brand_home, proc_home_cs, 'urgent', 'in_progress',
     '2026-11-05', '2026-11-21', null),

    (task_12, 'Monthly team performance review — Alpha Squad',
     'Compile individual CSAT, AHT, and productivity metrics for all Alpha Squad agents. Present findings and action plan.',
     emp_01, emp_01, null, null, 'high', 'assigned',
     '2026-11-24', '2026-11-30', null)
  on conflict do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- TASK COMMENTS (sample)
  -- ═══════════════════════════════════════════════════════════
  -- (These require author_id referencing profiles; without actual auth users
  --  seeded we insert placeholders that will work once profiles are created.
  --  Commented out to avoid FK violation in a fresh seed without auth users.)
  -- insert into task_comments (task_id, author_id, content) values ...;

  -- ═══════════════════════════════════════════════════════════
  -- APP SETTINGS (defaults)
  -- ═══════════════════════════════════════════════════════════
  insert into app_settings (key, value, description)
  values
    ('email_notifications_enabled', 'true',                                      'Enable or disable all outgoing email notifications'),
    ('app_url',                     '"http://localhost:5173"',                    'Base URL of the RosterFlow application'),
    ('company_name',                '"RosterFlow Demo"',                          'Company or organisation name shown in emails and UI'),
    ('email_from',                  '"noreply@rosterflow.demo"',                  'Sender address for all system-generated emails'),
    ('default_working_hours',       '8.0',                                        'Default daily working hours for new employees'),
    ('roster_lock_days_before_month','3',                                          'Days before month start after which roster is locked'),
    ('max_consecutive_working_days','6',                                           'Maximum consecutive working days before mandatory off'),
    ('leave_request_cutoff_days',   '2',                                           'Minimum advance notice (days) required for leave requests'),
    ('timezone',                    '"Asia/Kolkata"',                              'Default application timezone'),
    ('brand_min_coverage_alert',    'true',                                        'Alert when brand falls below min_daily_staff threshold')
  on conflict (key) do nothing;

  -- ═══════════════════════════════════════════════════════════
  -- ACTIVITY LOGS (seed a few bootstrap entries)
  -- ═══════════════════════════════════════════════════════════
  insert into activity_logs (actor_id, action, entity_type, entity_id, description, metadata)
  values
    (null, 'seed_data_loaded', 'system', null, 'Initial seed data loaded successfully', '{"version": "1.0.0", "environment": "demo"}'::jsonb),
    (null, 'roster_generated', 'roster_periods', roster_nov, 'November 2026 roster generated from seed data',   '{"month": 11, "year": 2026}'::jsonb),
    (null, 'roster_generated', 'roster_periods', roster_dec, 'December 2026 draft roster initialised',           '{"month": 12, "year": 2026}'::jsonb)
  on conflict do nothing;

end;
$$;
