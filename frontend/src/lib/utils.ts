import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#EF4444';
  if (score >= 70) return '#F59E0B';
  return '#22C55E';
}

export function getScoreGlowClass(score: number): string {
  if (score >= 90) return 'score-glow-red';
  if (score >= 70) return 'score-glow-amber';
  return 'score-glow-green';
}
