import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWatchTime(seconds: number) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total <= 0) return '0s';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return [`${h}h`, ...(m > 0 ? [`${m}m`] : []), ...(s > 0 ? [`${s}s`] : [])].join(' ');
  }
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export function formatDuration(seconds?: number | string | null): string {
  if (seconds === undefined || seconds === null || seconds === '') return '0:00';
  const sec = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  if (isNaN(sec) || sec <= 0) return '0:00';
  
  const totalSeconds = Math.floor(sec);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const remainingSecs = totalSeconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(remainingSecs)}`;
  }
  return `${mins}:${pad(remainingSecs)}`;
}
