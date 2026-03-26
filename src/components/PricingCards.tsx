"use client";

import { PricingCard } from "@/components/ui/pricing-card-1";
import { pricingPlans } from "@/lib/site";

type PricingPlan = (typeof pricingPlans)[number];

interface PricingCardsProps {
  plans: readonly PricingPlan[];
}

export function PricingCards({ plans }: PricingCardsProps) {
  return (
    <div className="card-grid-3">
      {plans.map((plan) => (
        <PricingCard key={plan.title} {...plan} />
      ))}
    </div>
  );
}
