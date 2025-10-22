import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'muted';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

export function Badge({ variant, size = 'md', children }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-green-900 text-green-300',
    error: 'bg-red-900 text-red-300',
    warning: 'bg-yellow-900 text-yellow-300',
    info: 'bg-blue-900 text-blue-300',
    neutral: 'bg-gray-800 text-gray-300',
    muted: 'bg-gray-700 text-gray-400',
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
}
