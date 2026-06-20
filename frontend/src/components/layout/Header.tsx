import React, { useState } from 'react';
import { Search, Bell, Settings, HelpCircle, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveClock } from '../../hooks';
import { cn } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { useModals } from '../../lib/ModalContext';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const clock = useLiveClock();
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { openSettings, notifications, clearNotifications } = useModals();

  return (
    <div
      className="h-12 flex items-center gap-4 px-5 flex-shrink-0 transition-colors duration-300"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <motion.input
          type="text"
          placeholder="Search tasks, intelligence..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] placeholder-slate-500 outline-none transition-all duration-200"
          style={{
            background: searchFocused ? 'var(--surface)' : 'rgba(132, 163, 147, 0.05)',
            border: searchFocused ? '1px solid var(--success)' : '1px solid var(--border)',
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchFocused && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono border border-[var(--border)] px-1 rounded bg-[var(--bg)]">
            ⌘K
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System time */}
      <div className="text-[10px] font-mono text-slate-500">
        SYS_TIME: <span className="text-[var(--text-secondary)]">{clock} UTC</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Bell size={15} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--danger)]" style={{ boxShadow: '0 0 4px var(--danger)' }} />
            )}
          </button>
          <AnimatePresence>
            {showNotifs && (
              <motion.div
                className="absolute right-0 top-10 w-72 rounded-xl border border-[var(--border)] shadow-2xl z-50 overflow-hidden"
                style={{ background: 'var(--surface)' }}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
              >
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] text-[var(--success)] hover:underline cursor-pointer font-medium font-mono bg-transparent border-0 outline-none"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div key={i} className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--elevated)]/40 transition-colors cursor-pointer last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[9px] font-bold uppercase tracking-wider font-mono', n.color)}>{n.type}</span>
                        <span className="text-[10px] text-slate-500 ml-auto font-mono">{n.time}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-snug">{n.msg}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-[var(--text-muted)] font-mono">
                    No new alerts.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={openSettings}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Settings size={15} />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-[var(--text-primary)] transition-colors cursor-pointer">
          <HelpCircle size={15} />
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--success)] to-[#40564C] flex items-center justify-center ml-1 cursor-pointer">
          <span className="text-[11px] font-bold text-white">AC</span>
        </div>
      </div>
    </div>
  );
};
