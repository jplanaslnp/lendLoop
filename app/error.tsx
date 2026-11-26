"use client"; // Error boundaries must be Client Components.

type RouteErrorProps = {
  error: unknown;
  retry: () => void;
};

/**
 * Route-level error boundary. Error details are intentionally not rendered or
 * logged here; monitoring is configured in a later phase (docs/03_TECH_STACK.md).
 */
export default function RouteError({ retry }: RouteErrorProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">
        Something went wrong
      </h1>
      <p>An unexpected error occurred. Please try again.</p>
      <div>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
