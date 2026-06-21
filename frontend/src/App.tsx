import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { Intelligence } from './pages/Intelligence';
import { Chat } from './pages/Chat';
import { DailyPlan } from './pages/DailyPlan';
import { WeeklySummary } from './pages/WeeklySummary';
import { Explorer } from './pages/Explorer';
import { ThemeProvider } from './lib/ThemeContext';
import { ModalProvider } from './lib/ModalContext';
import { SettingsDrawer } from './components/shared/SettingsDrawer';
import { StatusDrawer } from './components/shared/StatusDrawer';
import { NewRequestModal } from './components/shared/NewRequestModal';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex-1 flex min-h-0"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/daily-plan" element={<DailyPlan />} />
          <Route path="/weekly-summary" element={<WeeklySummary />} />
          <Route path="/explorer" element={<Explorer />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AppShell: React.FC = () => {
  return (
    <div className="flex h-full transition-colors duration-300 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Header />
        <div className="flex-1 flex min-h-0">
          <AnimatedRoutes />
        </div>
      </div>
      <SettingsDrawer />
      <StatusDrawer />
      <NewRequestModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ModalProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </ModalProvider>
    </ThemeProvider>
  );
};

export default App;
