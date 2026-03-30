/**
 * Formatting utilities for dates, numbers, and scores.
 */

import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy');
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatCredits(amount: number): string {
  if (amount > 0) return `+${amount}`;
  return String(amount);
}

export function formatINR(amountPaise: number): string {
  return `₹${(amountPaise / 100).toFixed(0)}`;
}
