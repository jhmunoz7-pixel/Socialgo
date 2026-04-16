/**
 * Card component - SocialGo design system
 * Clean, rounded card container with subtle shadow
 */

import { forwardRef, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "muted" | "outlined";
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      variant = "default",
      hoverable = false,
      padding = "md",
      ...props
    },
    ref
  ) => {
    const baseStyles = "rounded-[20px]";

    const variantStyles = {
      default: "bg-white border border-[var(--glass-border)] shadow-card",
      muted: "bg-[var(--bg)] border border-[var(--glass-border)]",
      outlined: "bg-transparent border border-[var(--glass-border)]",
    };

    const combinedClassName = clsx(
      baseStyles,
      variantStyles[variant],
      paddingMap[padding],
      hoverable && "card-hover cursor-pointer",
      className
    );

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
