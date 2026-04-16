/**
 * Input component - SocialGo design system
 * Clean form input with label and validation states
 */

import { forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
            {label}
            {props.required && <span className="ml-0.5" style={{ color: 'var(--primary-deep)' }}>*</span>}
          </label>
        )}

        <input
          ref={ref}
          disabled={disabled}
          className={clsx(
            "w-full px-3.5 py-2.5 bg-white border rounded-[10px] text-sm transition-all duration-150 outline-none",
            "placeholder:text-[var(--text-light)]",
            "focus:border-[var(--primary-deep)] focus:ring-2 focus:ring-[var(--primary-deep)]/20",
            "disabled:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
              : "border-[var(--glass-border)] hover:border-[var(--primary)]",
            className
          )}
          style={{ color: 'var(--text-dark)' }}
          {...props}
        />

        {error && (
          <p className="text-[11px] text-red-500 mt-1">{error}</p>
        )}

        {helperText && !error && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-light)' }}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
