/**
 * Button component - SocialGo design system
 * Supports multiple variants, sizes, and asChild pattern (without Radix dependency)
 */

import { forwardRef, ReactNode, isValidElement, cloneElement } from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
  children: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      isLoading = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    // Variant styles — SocialGo palette
    const variantStyles = {
      primary:
        "text-white hover:shadow-lg hover:opacity-90 active:scale-[0.98]",
      secondary:
        "border hover:opacity-80 active:scale-[0.98]",
      ghost:
        "hover:opacity-70 active:scale-[0.98]",
      danger:
        "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
    };

    // Size styles
    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const combinedClassName = clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      isLoading && "opacity-70 cursor-wait",
      className
    );

    // Inline styles for gradients
    const variantInlineStyles: Record<string, React.CSSProperties> = {
      primary: { background: "linear-gradient(135deg, #818CF8 0%, #A78BFA 100%)" },
      secondary: { borderColor: "rgba(148,163,184,0.3)", color: "#334155", background: "rgba(255,255,255,0.7)" },
      ghost: { color: "#334155" },
      danger: {},
    };

    // If asChild, clone the child element with button styles
    if (asChild && isValidElement(children)) {
      return cloneElement(children as React.ReactElement<any>, {
        className: clsx(combinedClassName, (children as any).props?.className),
        style: { ...variantInlineStyles[variant], ...(children as any).props?.style },
        ref,
      });
    }

    return (
      <button
        ref={ref}
        className={combinedClassName}
        style={variantInlineStyles[variant]}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
