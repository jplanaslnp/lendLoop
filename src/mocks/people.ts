/**
 * Phase 2 mock data (design prototype content). Replaced by Convex data in
 * later phases — never import from production backend code.
 */

/** Fixed "today" used by the design prototype, keeps mock dates deterministic. */
export const MOCK_TODAY = new Date(2026, 10, 26);

export type PersonId =
  "marc" | "laura" | "david" | "emma" | "ruben" | "bruno" | "sara" | "trevis";

export type Person = {
  id: PersonId;
  shortName: string;
  fullName: string;
  building: string;
  memberSince: string;
};

export const PEOPLE: Record<PersonId, Person> = {
  marc: {
    id: "marc",
    shortName: "Marc S.",
    fullName: "Marc Soler",
    building: "Building A",
    memberSince: "Mar 2025",
  },
  laura: {
    id: "laura",
    shortName: "Laura P.",
    fullName: "Laura Pérez",
    building: "Building B",
    memberSince: "Jun 2025",
  },
  david: {
    id: "david",
    shortName: "David R.",
    fullName: "David Ruiz",
    building: "Building A",
    memberSince: "Jan 2026",
  },
  emma: {
    id: "emma",
    shortName: "Emma L.",
    fullName: "Emma Laurent",
    building: "Building C",
    memberSince: "Apr 2025",
  },
  ruben: {
    id: "ruben",
    shortName: "Ruben G.",
    fullName: "Ruben Garcia",
    building: "Building B",
    memberSince: "Aug 2025",
  },
  bruno: {
    id: "bruno",
    shortName: "Bruno M.",
    fullName: "Bruno Martin",
    building: "Building A",
    memberSince: "Feb 2026",
  },
  sara: {
    id: "sara",
    shortName: "Sara T.",
    fullName: "Sara Torres",
    building: "Building C",
    memberSince: "Sep 2025",
  },
  trevis: {
    id: "trevis",
    shortName: "Trevis K.",
    fullName: "Trevis King",
    building: "Building A",
    memberSince: "May 2026",
  },
};

export function isPersonId(value: string): value is PersonId {
  return Object.hasOwn(PEOPLE, value);
}

export function avatarSrc(id: PersonId | "jaume"): string {
  return `/images/avatars/${id}.jpg`;
}

export function firstName(person: Person): string {
  return person.fullName.split(" ")[0] ?? person.fullName;
}

/** The signed-in mock user shown in the design. */
export const MOCK_CURRENT_USER = {
  fullName: "Jaume Planas",
  shortName: "Jaume P.",
  building: "Building A",
  buildingDetail: "Building A, 3rd floor",
  address: "Building A · 3rd floor, Door 3B",
  memberSince: "Mar 2025",
  avatar: avatarSrc("jaume"),
} as const;
