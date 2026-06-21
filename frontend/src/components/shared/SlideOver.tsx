/**
 * SlideOver — backwards-compatible wrapper for ExplainabilityDrawer.
 */

import React from 'react';
import { ExplainabilityDrawer } from './ExplainabilityDrawer';
import type { Task } from '../../types';

interface SlideOverProps {
  task: Task | null;
  onClose: () => void;
}

export const SlideOver: React.FC<SlideOverProps> = ({ task, onClose }) => {
  return (
    <ExplainabilityDrawer
      task={task}
      isOpen={task !== null}
      onClose={onClose}
    />
  );
};
