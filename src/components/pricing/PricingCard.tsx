/**
 * Pricing card component
 * Displays individual pricing tier with features and CTA
 * Can be marked as popular/featured
 */

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface PricingCardProps {
  name: string;
  description: string;
  price: number;
  currency?: string;
  billingCycle: "monthly" | "yearly";
  features: string[];
  isPrimary?: boolean;
  ctaText?: string;
  ctaHref?: string;
  children?: ReactNode;
}

export function PricingCard({
  name,
  description,
  price,
  currency = "$",
  billingCycle,
  features,
  isPrimary = false,
  ctaText = "Get Started",
  ctaHref = "#",
  children,
}: PricingCardProps) {
  return (
    <Card
      variant={isPrimary ? "default" : "default"}
      className={isPrimary ? "border-2 border-inchworm relative" : ""}
    >
      {isPrimary && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-inchworm text-navy px-md py-xs rounded-full text-body-xs font-bold whitespace-nowrap">
          Most Popular
        </div>
      )}

      <div className={isPrimary ? "p-2xl mt-lg" : "p-2xl"}>
        {/* Header */}
        <h3 className="text-heading-md text-seashell font-bold mb-md">
          {name}
        </h3>
        <p className="text-body-sm text-aurometal mb-2xl">{description}</p>

        {/* Price */}
        <div className="mb-2xl flex items-baseline gap-md">
          <span className={isPrimary ? "text-display-sm" : "text-heading-lg"}>
            <span className={isPrimary ? "text-inchworm" : "text-seashell"}>
              {currency}
            </span>
            <span
              className={
                isPrimary
                  ? "text-inchworm font-bold"
                  : "text-seashell font-bold"
              }
            >
              {price}
            </span>
          </span>
          <span className="text-body-sm text-aurometal">
            /{billingCycle === "monthly" ? "mo" : "yr"}
          </span>
        </div>

        {/* CTA Button */}
        <Button
          variant={isPrimary ? "primary" : "secondary"}
          size="md"
          className="w-full mb-2xl"
          asChild
        >
          <a href={ctaHref}>{ctaText}</a>
        </Button>

        {/* Features List */}
        <div className="space-y-md border-t border-aurometal/20 pt-2xl">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-md">
              <span className="text-inchworm font-bold flex-shrink-0">✓</span>
              <span className="text-body-sm text-seashell">{feature}</span>
            </div>
          ))}
        </div>

        {/* Custom content if provided */}
        {children && <div className="mt-2xl border-t border-aurometal/20 pt-2xl">{children}</div>}
      </div>
    </Card>
  );
}
