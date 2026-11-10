import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Spinner } from './spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading = false, disabled, children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-brand-500 via-accent-500 to-brand-500 bg-size-[200%_auto] px-4 py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:shadow-brand-500/50 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 animate-gradient ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      <span>{children}</span>
    </button>
  ),
);

Button.displayName = 'Button';