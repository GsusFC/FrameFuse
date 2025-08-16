import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--ring)]';
  const sizeCls = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-sm';
  const styles =
    variant === 'outline'
      ? 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[#0b152a]'
      : variant === 'ghost'
      ? 'border border-[var(--border)]/60 bg-transparent text-[var(--text)] hover:bg-[var(--surface)]'
      : variant === 'danger'
      ? 'bg-[#ef4444] text-white hover:opacity-90 shadow-sm'
      : variant === 'accent'
      ? 'bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90 shadow-sm'
      : 'bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90 shadow-sm';
  return <button className={`${base} ${sizeCls} ${styles} ${className}`} {...props} />;
};


