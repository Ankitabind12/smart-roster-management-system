import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Tag, GitBranch, CheckSquare,
  Clock, PartyPopper, AlertTriangle, Bell, Settings, ChevronLeft,
  ChevronRight, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/roster', label: 'Roster', icon: Calendar },
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/brands', label: 'Brands & Processes', icon: Tag },
  { path: '/pods', label: 'Pods & Teams', icon: GitBranch },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/leave', label: 'Leave Management', icon: Clock },
  { path: '/holidays', label: 'Holidays', icon: PartyPopper },
  { path: '/coverage', label: 'Coverage & Conflicts', icon: AlertTriangle },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-30 transition-all duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[60px] border-b border-slate-100">
        <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-slate-900">RosterFlow</span>
            <p className="text-xs text-slate-400 leading-none">Workforce Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        <div className="space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => cn(
                'sidebar-item',
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-slate-100">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
