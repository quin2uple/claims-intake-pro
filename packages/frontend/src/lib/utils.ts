import { format, formatDistanceToNow } from 'date-fns';
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    pending: 'bg-gray-100 text-gray-800',
    flagged: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    duplicate: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    ClaimDepot: 'bg-indigo-100 text-indigo-800',
    'ClassAction.org': 'bg-pink-100 text-pink-800',
    TopClassActions: 'bg-cyan-100 text-cyan-800',
    Manual: 'bg-orange-100 text-orange-800',
  };
  return colors[source] || 'bg-gray-100 text-gray-800';
}
