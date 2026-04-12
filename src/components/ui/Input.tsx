/**
 * Input component - Branded text input for forms
 * Follows Loonshot brand design system
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
          <label className="block text-body-sm font-bold text-seashell mb-md">
            {label}
            {props.required && <span className="text-inchworm ml-xs">*</span>}
          </label>
        )}

        <input
          ref={ref}
          disabled={disabled}
          className={clsx(
            "w-full px-lg py-md bg-navy border rounded-md text-seashell placeholder-aurometal transition-smooth",
            "focus:outline-none focus:border-inchworm focus:ring-2 focus:ring-inchworm/20",
            "disabled:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-aurometal/30 hover:border-aurometal/50",
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-body-xs text-red-500 mt-xs">{error}</p>
        )}

        {helperText && !error && (
          <p className="text-body-xs text-aurometal mt-xs">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
