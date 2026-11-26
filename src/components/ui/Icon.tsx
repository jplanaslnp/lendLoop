import type { ReactNode, SVGProps } from "react";

/**
 * Icon set hand-copied from the design export (inline SVG paths, 24×24 grid).
 * `cap`/`join` mirror the original stroke-linecap/linejoin attributes.
 */
type IconDef = {
  body: ReactNode;
  cap?: boolean;
  join?: boolean;
  fill?: boolean;
};

const TRAY = "M4 14.5v4A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-4";
const CIRCLE = <circle cx="12" cy="12" r="8.5" />;

const ICONS = {
  wrench: {
    body: (
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
    join: true,
  },
  plus: { body: <path d="M12 5v14M5 12h14" />, cap: true },
  user: {
    body: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6" />
      </>
    ),
    cap: true,
  },
  userFilled: {
    body: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6z" />
      </>
    ),
    cap: true,
    fill: true,
  },
  chevronDown: { body: <path d="m6 9 6 6 6-6" />, cap: true, join: true },
  chevronLeft: { body: <path d="m15 18-6-6 6-6" />, cap: true, join: true },
  chevronRight: { body: <path d="m9 18 6-6-6-6" />, cap: true, join: true },
  arrowLeft: {
    body: <path d="M19 12H5M11 18l-6-6 6-6" />,
    cap: true,
    join: true,
  },
  bell: {
    body: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
    cap: true,
    join: true,
  },
  home: {
    body: (
      <>
        <path d="M3.5 10.5 12 4l8.5 6.5V20h-17z" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    join: true,
  },
  borrow: {
    body: (
      <>
        <path d="M12 3.5v11M7.5 10 12 14.5 16.5 10" />
        <path d={TRAY} />
      </>
    ),
    cap: true,
    join: true,
  },
  lend: {
    body: (
      <>
        <path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8" />
        <path d={TRAY} />
      </>
    ),
    cap: true,
    join: true,
  },
  publish: {
    body: (
      <>
        <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
        <path d={TRAY} />
      </>
    ),
    cap: true,
    join: true,
  },
  shareSquare: {
    body: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    cap: true,
    join: true,
  },
  grid: {
    body: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  garden: {
    body: (
      <>
        <path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z" />
        <path d="M4 20l8-8" />
      </>
    ),
    cap: true,
  },
  sports: {
    body: (
      <>
        <path d="M2.5 12h19" />
        <rect x="5" y="8" width="3" height="8" rx="1" />
        <rect x="16" y="8" width="3" height="8" rx="1" />
      </>
    ),
    cap: true,
  },
  camping: {
    body: (
      <>
        <path d="M12 4 3 20h18z" />
        <path d="M12 13l-3 7M12 13l3 7" />
      </>
    ),
    join: true,
  },
  electronics: {
    body: (
      <>
        <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
        <path d="M9 20h6M12 16.5V20" />
      </>
    ),
    cap: true,
  },
  cleaning: {
    body: <path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
    join: true,
  },
  party: {
    body: (
      <>
        <path d="M12 3.5c3 0 5 2.4 5 5.4 0 3.4-2.6 6.1-5 6.1s-5-2.7-5-6.1c0-3 2-5.4 5-5.4z" />
        <path d="M12 15l-1 1.5h2zM12 16.5c0 2-1.5 2.5-1.5 4" />
      </>
    ),
    cap: true,
    join: true,
  },
  kids: {
    body: (
      <>
        <circle cx="12" cy="13" r="7" />
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="18" cy="6" r="2.2" />
        <path d="M9.5 15.5c1.4 1.2 3.6 1.2 5 0" />
      </>
    ),
    cap: true,
  },
  books: {
    body: (
      <path d="M3 5.5c3-1 6-1 9 1v13c-3-2-6-2-9-1zM21 5.5c-3-1-6-1-9 1v13c3-2 6-2 9-1z" />
    ),
    join: true,
  },
  calendar: {
    body: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    cap: true,
  },
  calendarPlus: {
    body: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
      </>
    ),
    cap: true,
    join: true,
  },
  send: {
    body: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z" />,
    cap: true,
    join: true,
  },
  clock: {
    body: (
      <>
        {CIRCLE}
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    cap: true,
    join: true,
  },
  check: { body: <path d="M5 12.5l4.5 4.5L19 7.5" />, cap: true, join: true },
  x: {
    body: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
    cap: true,
    join: true,
  },
  returnArrow: {
    body: (
      <>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </>
    ),
    cap: true,
    join: true,
  },
  box: {
    body: (
      <>
        <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z" />
        <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
      </>
    ),
    cap: true,
    join: true,
  },
  swap: {
    body: <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />,
    cap: true,
    join: true,
  },
  alert: {
    body: (
      <>
        {CIRCLE}
        <path d="M12 7.5v5M12 16v.5" />
      </>
    ),
    cap: true,
    join: true,
  },
  hourglass: {
    body: (
      <path d="M7 3.5h10M7 20.5h10M8 3.5c0 5 8 4.5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 4.5-8 8.5s8 3.5 8 8.5" />
    ),
    cap: true,
    join: true,
  },
  ban: {
    body: (
      <>
        {CIRCLE}
        <path d="M6 6l12 12" />
      </>
    ),
    cap: true,
    join: true,
  },
  pin: {
    body: (
      <>
        <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    cap: true,
    join: true,
  },
  info: {
    body: (
      <>
        {CIRCLE}
        <path d="M12 11v5M12 8v.5" />
      </>
    ),
    cap: true,
    join: true,
  },
  hand: {
    body: (
      <>
        <path d="M4 13.5 8.5 18H15l5-5.5-1.6-1.4L15 14H10" />
        <path d="M4 13.5 7 10.5h5.5l1.5 1.5-1 1H10" />
      </>
    ),
    cap: true,
    join: true,
  },
  lock: {
    body: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </>
    ),
    cap: true,
    join: true,
  },
  mail: {
    body: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
      </>
    ),
    cap: true,
    join: true,
  },
  eye: {
    body: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    cap: true,
    join: true,
  },
  building: {
    body: (
      <>
        <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
        <path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10.5 20.5v-3h3v3" />
      </>
    ),
    cap: true,
    join: true,
  },
  pencil: {
    body: <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z" />,
    cap: true,
    join: true,
  },
  edit: {
    body: (
      <>
        <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    cap: true,
    join: true,
  },
  logout: {
    body: (
      <>
        <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
        <path d="M10 16l4-4-4-4M14 12H4" />
      </>
    ),
    cap: true,
    join: true,
  },
  trash: {
    body: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />,
    cap: true,
    join: true,
  },
  dots: {
    body: (
      <>
        <circle cx="5" cy="12" r="1.9" />
        <circle cx="12" cy="12" r="1.9" />
        <circle cx="19" cy="12" r="1.9" />
      </>
    ),
    fill: true,
  },
  grip: {
    body: (
      <>
        <circle cx="8" cy="9" r="1.5" />
        <circle cx="12" cy="9" r="1.5" />
        <circle cx="16" cy="9" r="1.5" />
        <circle cx="8" cy="15" r="1.5" />
        <circle cx="12" cy="15" r="1.5" />
        <circle cx="16" cy="15" r="1.5" />
      </>
    ),
    fill: true,
  },
  image: {
    body: (
      <>
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="m21 16-5-5-8.5 8.5" />
      </>
    ),
    cap: true,
    join: true,
  },
  cloudUpload: {
    body: (
      <>
        <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5" />
        <path d="M12 12v8M8.8 15 12 11.8 15.2 15" />
      </>
    ),
    cap: true,
    join: true,
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Accessible label; when omitted the icon is decorative. */
  title?: string;
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  title,
  ...rest
}: IconProps) {
  const def: IconDef = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={def.fill ? "currentColor" : "none"}
      stroke={def.fill && name !== "userFilled" ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap={def.cap ? "round" : undefined}
      strokeLinejoin={def.join ? "round" : undefined}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {def.body}
    </svg>
  );
}

/** Brand mark: filled wrench used by the LendLoop wordmark. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#7040A0"
      stroke="#7040A0"
      strokeWidth={1.2}
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {ICONS.wrench.body}
    </svg>
  );
}

export function GoogleMark() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.4a12 12 0 0 0 0 10.8z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}
