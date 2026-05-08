import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPKR(value: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function currentMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function makeStudentCode(id?: string | null) {
  if (!id) return 'STU-NEW';
  return `STU-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function shortId(prefix: string, id?: string | null) {
  if (!id) return `${prefix}-NEW`;
  return `${prefix}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function formatMonth(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}
