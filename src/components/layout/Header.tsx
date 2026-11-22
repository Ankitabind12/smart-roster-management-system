import React, { useState } from 'react';
import { Bell, Search, ChevronDown, LogOut, User, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getInitials, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  sidebarCollapsed: boolean;
}

export function Header({ title, sidebarCollapsed }: HeaderProps) {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 transition-all',
        sidebarCollapsed ? 'left-16' : 'left-60'
      )}
    >
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
          />
        </div>

        {/* Quick Add */}
        <div className="relative">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="btn-primary py-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Add
          </button>
          {showQuickActions && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              {[
                { label: 'Add Employee', path: '/employees?action=add' },
                { label: 'Add Brand', path: '/brands?action=add' },
                { label: 'Assign Task', path: '/tasks?action=add' },
                { label: 'Request Leave', path: '/leave?action=add' },
                { label: 'Add Holiday', path: '/holidays?action=add' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setShowQuickActions(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">
              {user ? getInitials(user.full_name) : '?'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-medium text-slate-900 leading-tight">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 capitalize leading-tight">{user?.role?.replace('_', ' ') || 'Guest'}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <User className="w-3.5 h-3.5" /> Profile
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { signOut(); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
