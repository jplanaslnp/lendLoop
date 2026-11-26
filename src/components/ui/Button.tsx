import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
} from "react";

import { cn } from "@/lib/cn";

/**
 * Pill buttons from the design. Variants carry colour/border/shadow/hover;
 * size (height, padding, font-size, gap) is passed per use so each screen keeps
 * its exact measurements.
 */
export type ButtonVariant =
  | "primary"
  | "primaryFlat"
  | "outline"
  | "neutral"
  | "danger"
  | "ghostDanger"
  | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-none bg-primary text-white shadow-cta hover:bg-primary-hover hover:text-white",
  primaryFlat:
    "border-none bg-primary text-white hover:bg-primary-hover hover:text-white",
  outline:
    "border-[1.5px] border-solid border-primary bg-surface text-primary hover:bg-lavender-soft",
  neutral:
    "border-[1.5px] border-solid border-[rgba(47,70,54,.2)] bg-surface text-forest hover:bg-hover-sage-2 hover:text-forest",
  danger: "border-none bg-danger text-white hover:bg-danger-hover",
  ghostDanger:
    "border-none bg-transparent text-danger hover:bg-danger-hover-bg",
  ghost: "border-none bg-transparent text-primary hover:bg-lavender-soft",
};

const BASE =
  "inline-flex items-center justify-center rounded-full whitespace-nowrap transition-colors box-border";

export function buttonClasses(variant: ButtonVariant, className?: string) {
  return cn(BASE, VARIANT_CLASSES[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, className)}
      {...props}
    />
  );
}

type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: ButtonVariant;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function ButtonLink({
  variant = "primary",
  className,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={buttonClasses(variant, className)}
      {...props}
    />
  );
}
