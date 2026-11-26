import { cn } from "@/lib/cn";

/**
 * Approximate-area map: static neighbourhood image with a lavender radius
 * circle (no exact location is ever shown).
 */
export function MapPreview({
  circleSize,
  className,
}: {
  circleSize: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative aspect-[3/1] bg-cover bg-center", className)}
      style={{ backgroundImage: "url(/images/misc/map.jpg)" }}
      role="img"
      aria-label="Map of the approximate pickup area"
    >
      <span
        className="absolute top-1/2 left-[51%] box-content rounded-full border-2 border-solid border-[rgba(112,64,160,.5)] bg-[rgba(112,64,160,.16)]"
        style={{
          width: circleSize,
          height: circleSize,
          margin: `-${circleSize / 2}px 0 0 -${circleSize / 2}px`,
        }}
        aria-hidden
      />
    </div>
  );
}
