"use client"; // Error boundaries must be Client Components.

type GlobalErrorProps = {
  error: unknown;
  retry: () => void;
};

/**
 * Root-level error boundary. It replaces the root layout, so it renders its own
 * <html>/<body> and does not receive global styles; inline styles keep it legible.
 */
export default function GlobalError({ retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#E8F0E2",
          color: "#2F4636",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Something went wrong · LendLoop</title>
        <main style={{ padding: 24, maxWidth: 560 }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
