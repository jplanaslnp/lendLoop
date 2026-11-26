import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

/** Dashed empty-state panel used by Explore, Borrowing/Lending and My Profile. */
export function EmptyState({
  title,
  description,
  className,
  titleClassName = "text-lg",
  descriptionClassName = "mt-2 text-[15px]",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border border-dashed border-[rgba(47,70,54,.18)] text-center",
        className,
      )}
    >
      <p className={cn("m-0 font-bold text-forest", titleClassName)}>{title}</p>
      <p className={cn("mb-0 text-ink-soft", descriptionClassName)}>
        {description}
      </p>
    </div>
  );
}
