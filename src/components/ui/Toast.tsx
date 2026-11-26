"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";

/** Transient feedback message with auto-dismiss (design: 3.2–3.8 s). */
export function useToast(durationMs = 3600) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, show };
}

type ToastProps = {
  message: string | null;
  icon?: IconName;
  /** Bottom offset classes (differs per screen/breakpoint in the design). */
  className?: string;
};

export function Toast({
  message,
  icon = "bell",
  className = "bottom-8",
}: ToastProps) {
  return (
    <div aria-live="polite" role="status">
      {message ? (
        <div
          className={cn(
            "fixed left-1/2 z-60 box-border flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-2xl bg-forest px-5 py-3.5 text-[14.5px] font-semibold text-surface shadow-toast",
            className,
          )}
        >
          <Icon
            name={icon}
            size={18}
            strokeWidth={icon === "check" ? 2.4 : 2}
            className="flex-none text-success-toast"
          />
          {message}
        </div>
      ) : null}
    </div>
  );
}
