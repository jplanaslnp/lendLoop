import { cn } from "@/lib/cn";

/** Loading placeholder with the same footprint as an Explore ToolCard. */
export function ToolCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex min-w-0 animate-pulse flex-col overflow-hidden rounded-2xl border border-solid border-[rgba(47,70,54,.07)] bg-surface shadow-card md:rounded-card",
        className,
      )}
    >
      <div className="aspect-[4/3] bg-image" />
      <div className="flex flex-col gap-2 p-3 md:px-5 md:py-[18px]">
        <div className="h-4 w-2/3 rounded-full bg-[rgba(47,70,54,.1)] md:h-5" />
        <div className="h-3 w-full rounded-full bg-[rgba(47,70,54,.07)]" />
        <div className="h-3 w-4/5 rounded-full bg-[rgba(47,70,54,.07)]" />
        <div className="my-1.5 h-px bg-[rgba(47,70,54,.1)]" />
        <div className="h-3 w-1/2 rounded-full bg-[rgba(47,70,54,.07)]" />
      </div>
    </div>
  );
}
