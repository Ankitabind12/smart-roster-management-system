import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/roster': 'Roster',
  '/employees': 'Employees',
  '/brands': 'Brands & Processes',
  '/pods': 'Pods & Teams',
  '/tasks': 'Tasks',
  '/leave': 'Leave Management',
  '/holidays': 'Holidays',
  '/coverage': 'Coverage & Conflicts',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'RosterFlow';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header title={title} sidebarCollapsed={collapsed} />
      <main className={cn(
        'pt-[60px] min-h-screen transition-all',
        collapsed ? 'pl-16' : 'pl-60'
      )}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
