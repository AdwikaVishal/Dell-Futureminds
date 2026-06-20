import React, { createContext, useContext, useState } from 'react';

export type ModelName = 'Gemini 1.5 Pro (Recommended)' | 'Gemini 1.5 Flash' | 'Claude 3.5 Sonnet';

export interface NotificationItem {
  type: string;
  msg: string;
  time: string;
  color: string;
}

interface ModalContextType {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  isStatusOpen: boolean;
  openStatus: () => void;
  closeStatus: () => void;
  isNewRequestOpen: boolean;
  openNewRequest: () => void;
  closeNewRequest: () => void;

  activeModel: ModelName;
  setActiveModel: (model: ModelName) => void;
  autoSync: boolean;
  setAutoSync: (sync: boolean) => void;
  latency: number;
  setLatency: (ms: number) => void;

  notifications: NotificationItem[];
  addNotification: (n: NotificationItem) => void;
  clearNotifications: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const [activeModel, setActiveModel] = useState<ModelName>('Gemini 1.5 Pro (Recommended)');
  const [autoSync, setAutoSync] = useState(true);
  const [latency, setLatency] = useState(150);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { type: 'INCIDENT', msg: 'P1 Login Service: 503 errors detected', time: '2m ago', color: 'text-[var(--danger)]' },
    { type: 'ESCALATION', msg: 'VP Engineering escalation received', time: '15m ago', color: 'text-[var(--warning)]' },
    { type: 'AGENT', msg: 'Priority recalculation complete', time: '1h ago', color: 'text-[var(--success)]' },
  ]);

  const addNotification = (n: NotificationItem) => {
    setNotifications((prev) => [n, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <ModalContext.Provider
      value={{
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        isStatusOpen,
        openStatus: () => setIsStatusOpen(true),
        closeStatus: () => setIsStatusOpen(false),
        isNewRequestOpen,
        openNewRequest: () => setIsNewRequestOpen(true),
        closeNewRequest: () => setIsNewRequestOpen(false),
        activeModel,
        setActiveModel,
        autoSync,
        setAutoSync,
        latency,
        setLatency,
        notifications,
        addNotification,
        clearNotifications,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
};
