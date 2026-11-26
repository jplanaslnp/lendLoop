"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

/** Standard design modal: bottom sheet on mobile, centred on desktop. */
const DEFAULT_OVERLAY =
  "fixed inset-0 z-50 flex items-end justify-center bg-[rgba(31,46,36,.42)] p-3 backdrop-blur-[4px] md:items-center md:p-6";
const PANEL_BASE = "box-border w-full bg-surface text-forest outline-none";
const DEFAULT_PANEL = "max-w-[440px] rounded-modal p-7 shadow-modal";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name (or use `labelledBy`). */
  label?: string;
  labelledBy?: string;
  /** Replaces the default overlay classes (layout, backdrop, z-index). */
  overlayClassName?: string;
  /** Replaces the default panel size/radius/padding/shadow classes. */
  panelClassName?: string;
  /** Close when the backdrop is clicked (the design does, except "published"). */
  closeOnBackdrop?: boolean;
};

/**
 * Accessible modal dialog: focus moves into the dialog, Tab is trapped,
 * Escape closes, focus returns to the trigger, and page scroll is locked.
 */
export function Dialog({
  open,
  onClose,
  children,
  label,
  labelledBy,
  overlayClassName,
  panelClassName,
  closeOnBackdrop = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl?.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={overlayClassName ?? DEFAULT_OVERLAY}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={cn(PANEL_BASE, panelClassName ?? DEFAULT_PANEL)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
