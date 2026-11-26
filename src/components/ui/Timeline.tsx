import { Icon } from "./Icon";

export type TimelineStepKind =
  | "done"
  | "current"
  | "todo"
  | "yellow"
  | "red"
  | "lavender"
  | "failed"
  | "cancelled";

export type TimelineStep = {
  title: string;
  subtitle?: string;
  kind: TimelineStepKind;
};

const DOT: Record<
  TimelineStepKind,
  { bg: string; border: string; icon?: "check" | "x" }
> = {
  done: { bg: "#2EA44F", border: "#2EA44F", icon: "check" },
  current: { bg: "#F3ECFA", border: "#7040A0" },
  todo: { bg: "transparent", border: "rgba(47,70,54,.25)" },
  yellow: { bg: "#FFE48A", border: "#E0A800" },
  red: { bg: "#FCE1DD", border: "#D93A2B" },
  lavender: { bg: "#E9DDF5", border: "#7040A0" },
  failed: { bg: "#C62828", border: "#C62828", icon: "x" },
  cancelled: { bg: "#7A867E", border: "#7A867E", icon: "x" },
};

/** Vertical status timeline for a loan request. */
export function Timeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <ol className="m-0 list-none p-0 pt-5 pb-1">
      {steps.map((step, i) => {
        const dot = DOT[step.kind];
        const next = steps[i + 1];
        const lineColor =
          step.kind === "done" && next?.kind === "done"
            ? "#2EA44F"
            : "rgba(47,70,54,.18)";
        return (
          <li
            key={`${step.title}-${i}`}
            className="grid grid-cols-[26px_minmax(0,1fr)] gap-x-4"
          >
            <div className="flex flex-col items-center">
              <div
                className="box-border flex size-[26px] flex-none items-center justify-center rounded-full border-2 border-solid"
                style={{ background: dot.bg, borderColor: dot.border }}
              >
                {dot.icon ? (
                  <Icon
                    name={dot.icon}
                    size={14}
                    strokeWidth={2.6}
                    className="text-white"
                  />
                ) : null}
              </div>
              {next ? (
                <div
                  className="my-[3px] min-h-3.5 w-0.5 flex-1 rounded-[2px]"
                  style={{ background: lineColor }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 pt-0.5 pb-[18px]">
              <div
                className="text-[15.5px] font-bold"
                style={{ color: step.kind === "todo" ? "#7D8C82" : "#2F4636" }}
              >
                {step.title}
              </div>
              {step.subtitle ? (
                <div className="mt-0.5 text-sm text-pretty text-ink-soft">
                  {step.subtitle}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
