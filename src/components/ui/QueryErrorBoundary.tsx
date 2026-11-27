"use client";

import { Component, type ReactNode } from "react";

/**
 * Catches errors thrown by Convex `useQuery` while rendering and shows a
 * fallback with a retry. Retrying remounts the children, which re-subscribes.
 */
export class QueryErrorBoundary extends Component<
  { fallback: (retry: () => void) => ReactNode; children: ReactNode },
  { failed: boolean; attempt: number }
> {
  override state = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<{ failed: boolean }> {
    return { failed: true };
  }

  retry = () => {
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  };

  override render() {
    if (this.state.failed) return this.props.fallback(this.retry);
    return (
      <div key={this.state.attempt} className="contents">
        {this.props.children}
      </div>
    );
  }
}
