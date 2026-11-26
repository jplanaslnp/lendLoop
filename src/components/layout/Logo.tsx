import Link from "next/link";

import { BrandMark } from "@/components/ui/Icon";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/** LendLoop wordmark. Sizes match the design's per-context wordmarks. */
const VARIANTS = {
  header: { icon: 28, text: "text-[21px]", gap: "gap-2.5" },
  footer: { icon: 28, text: "text-[22px]", gap: "gap-2.5" },
  compact: { icon: 24, text: "text-lg", gap: "gap-2" },
  small: { icon: 20, text: "text-base", gap: "gap-[7px]" },
} as const;

type LogoProps = {
  variant?: keyof typeof VARIANTS;
  href?: string;
  asLink?: boolean;
  className?: string;
};

export function Logo({
  variant = "header",
  href = "/explore",
  asLink = true,
  className,
}: LogoProps) {
  const v = VARIANTS[variant];
  const content = (
    <>
      <BrandMark size={v.icon} />
      <span
        className={cn(
          "font-extrabold tracking-tighter whitespace-nowrap text-primary-deep",
          v.text,
        )}
      >
        {siteConfig.name}
      </span>
    </>
  );
  const classes = cn("flex items-center text-primary-deep", v.gap, className);
  if (!asLink) return <div className={classes}>{content}</div>;
  return (
    <Link
      href={href}
      className={cn(classes, "hover:text-primary-deep")}
      aria-label={`${siteConfig.name} home`}
    >
      {content}
    </Link>
  );
}
