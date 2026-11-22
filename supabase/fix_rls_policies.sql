-- ============================================================
-- RosterFlow — Fix RLS policies for demo (allow all authenticated users)
-- Run this in: https://supabase.com/dashboard/project/mukbsmqzoizhcfafjszo/sql/new
-- ============================================================

-- Allow ALL authenticated users to insert/update employees (not just admins)
DROP POLICY IF EXISTS "employees_insert_manager" ON employees;
DROP POLICY IF EXISTS "employees_update_manager" ON employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON employees;

CREATE POLICY "employees_insert_authenticated" ON employees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "employees_update_authenticated" ON employees
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "employees_delete_authenticated" ON employees
  FOR DELETE TO authenticated USING (true);

-- Allow ALL authenticated users to insert/update pods
DROP POLICY IF EXISTS "pods_insert_manager" ON pods;
DROP POLICY IF EXISTS "pods_update_manager" ON pods;

CREATE POLICY "pods_insert_authenticated" ON pods
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "pods_update_authenticated" ON pods
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "pods_delete_authenticated" ON pods
  FOR DELETE TO authenticated USING (true);

-- Allow ALL authenticated users to insert/update brands
DROP POLICY IF EXISTS "brands_insert_manager" ON brands;
DROP POLICY IF EXISTS "brands_update_manager" ON brands;

CREATE POLICY "brands_insert_authenticated" ON brands
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "brands_update_authenticated" ON brands
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "brands_delete_authenticated" ON brands
  FOR DELETE TO authenticated USING (true);

-- Allow ALL authenticated users to insert/update processes
DROP POLICY IF EXISTS "processes_insert_manager" ON processes;
DROP POLICY IF EXISTS "processes_update_manager" ON processes;

CREATE POLICY "processes_insert_authenticated" ON processes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "processes_update_authenticated" ON processes
  FOR UPDATE TO authenticated USING (true);

-- Allow ALL authenticated users to insert/update leave requests
DROP POLICY IF EXISTS "leave_insert_own" ON leave_requests;
DROP POLICY IF EXISTS "leave_update_manager" ON leave_requests;

CREATE POLICY "leave_insert_authenticated" ON leave_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "leave_update_authenticated" ON leave_requests
  FOR UPDATE TO authenticated USING (true);

-- Allow ALL authenticated users to insert/update tasks
DROP POLICY IF EXISTS "tasks_insert_manager" ON tasks;
DROP POLICY IF EXISTS "tasks_update_assignee_or_manager" ON tasks;
DROP POLICY IF EXISTS "tasks_select_assignee_or_manager" ON tasks;

CREATE POLICY "tasks_select_authenticated" ON tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tasks_insert_authenticated" ON tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "tasks_update_authenticated" ON tasks
  FOR UPDATE TO authenticated USING (true);

-- Allow ALL authenticated users to insert/update holidays
DROP POLICY IF EXISTS "holidays_insert_manager" ON holidays;
DROP POLICY IF EXISTS "holidays_update_manager" ON holidays;
DROP POLICY IF EXISTS "holidays_delete_admin" ON holidays;

CREATE POLICY "holidays_insert_authenticated" ON holidays
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "holidays_update_authenticated" ON holidays
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "holidays_delete_authenticated" ON holidays
  FOR DELETE TO authenticated USING (true);

-- Allow ALL authenticated users to manage profiles
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_insert_authenticated" ON profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_update_authenticated" ON profiles
  FOR UPDATE TO authenticated USING (true);

-- Verify policies updated
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
