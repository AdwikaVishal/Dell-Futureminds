import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Brain, MessageSquare, CalendarDays,
  BarChart2, Table2, Settings, LogOut, Zap, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useModals } from '../../lib/ModalContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/intelligence', label: 'Intelligence', icon: Brain },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/daily-plan', label: 'Daily Plan', icon: CalendarDays },
  { path: '/weekly-summary', label: 'Weekly Summary', icon: BarChart2 },
  { path: '/explorer', label: 'Explorer', icon: Table2 },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { openNewRequest, openStatus, openSettings } = useModals();

  return (
    <div
      className="flex flex-col h-full w-[200px] flex-shrink-0 animate-fade-in"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--success)] flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-[var(--bg)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] leading-tight">TaskPilot AI</div>
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">Enterprise Chief of Staff</div>
          </div>
        </div>
      </div>

      {/* New AI Request */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={openNewRequest}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--success)]/30 hover:bg-[var(--surface)] transition-all duration-200 font-medium cursor-pointer"
        >
          <span className="text-base leading-none">+</span>
          New AI Request
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink key={path} to={path}>
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative cursor-pointer',
                  isActive
                    ? 'text-[var(--success)] bg-[var(--success)]/8'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--elevated)]/30'
                )}
                whileHover={{ x: 1 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[var(--success)]"
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                  />
                )}
                <Icon size={15} className={isActive ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'} />
                <span className={cn('font-medium text-[13px]', isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>{label}</span>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="px-4 py-4 border-t border-[var(--border)] mt-auto">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] dot-pulse" style={{ boxShadow: '0 0 6px var(--success)' }} />
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">All agents running</span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={openStatus}
            className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Activity size={11} /> Status
          </button>
          <button
            onClick={openSettings}
            className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Settings size={11} /> Settings
          </button>
          <button className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer">
            <LogOut size={11} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
