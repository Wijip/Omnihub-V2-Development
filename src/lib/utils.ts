import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWatchTime(seconds: number) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
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
