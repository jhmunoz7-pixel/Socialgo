/**
 * Card component - Branded card container for content
 * Provides consistent styling for content sections
 * Follows Loonshot brand design system
 */

import { forwardRef, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "dark" | "light";
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      variant = "default",
      hoverable = false,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = "rounded-lg border";

    // Variant styles
    const variantStyles = {
      default: "bg-charcoal border-aurometal/20",
      dark: "bg-navy border-aurometal/10",
      light: "bg-seashell border-aurometal/10",
    };

    // Hoverable state
    const hoverableStyles = hoverable
      ? "transition-smooth hover:border-inchworm/30 hover:shadow-lg"
      : "";

    const combinedClassName = clsx(
      baseStyles,
      variantStyles[variant],
      hoverableStyles,
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
