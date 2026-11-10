import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-300 focus:bg-white/10 focus:ring-2 ${
            error
              ? 'border-rose-400/60 focus:ring-rose-400/40'
              : 'border-white/10 focus:border-accent-400/60 focus:ring-accent-400/30'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="animate-fade-in-up text-sm text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';