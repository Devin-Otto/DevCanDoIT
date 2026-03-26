import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { Diamond } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  title: string;
  price?: string;
  priceDescription?: string;
  description: string;
  features?: readonly string[];
  buttonText: string;
  imageSrc?: string;
  imageAlt?: string;
  isUnique?: boolean;
  className?: string;
}

const cardVariants: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.03,
    y: -5,
    boxShadow: "0px 15px 30px -5px hsl(var(--foreground) / 0.1)",
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

const imageVariants: Variants = {
  initial: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    rotate: -5,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

const PricingCard = React.forwardRef<HTMLDivElement, PricingCardProps>(
  (
    {
      className,
      title,
      price,
      priceDescription,
      description,
      features,
      buttonText,
      imageSrc,
      imageAlt,
      isUnique = false,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="initial"
        whileHover="hover"
        className={cn(
          "relative flex flex-col justify-between rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-shadow duration-300",
          isUnique && "border-accent/40 bg-card/90",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">{title}</h3>
              {price && (
                <div className="mt-2">
                  <span className="text-4xl font-bold">{price}</span>
                  <p className="text-sm text-muted-foreground">
                    {priceDescription}
                  </p>
                </div>
              )}
            </div>
            {imageSrc && (
              <motion.img
                src={imageSrc}
                alt={imageAlt || title}
                width={80}
                height={80}
                className="select-none rounded-2xl object-cover"
                variants={imageVariants}
              />
            )}
          </div>

          <p className="text-muted-foreground">{description}</p>

          {features && (
            <ul className="space-y-2 pt-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Diamond className="h-4 w-4 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <Button className="w-full">{buttonText}</Button>
        </div>
      </motion.div>
    );
  },
);

PricingCard.displayName = "PricingCard";

export { PricingCard };
