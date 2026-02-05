import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'new' | 'flagged' | 'pending' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'new', className = '' }) => {
  const variantStyles = {
    new: 'bg-blue-100 text-blue-800',
    flagged: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
