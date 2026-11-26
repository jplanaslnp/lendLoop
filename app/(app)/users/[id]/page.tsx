import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserProfileScreen } from "@/features/profiles/UserProfileScreen";
import { isPersonId, PEOPLE } from "@/mocks/people";

/**
 * Known mock ids are prerendered; other ids are allowed to block (there is
 * no approved loading design for these pages yet).
 */
export const instant = false;

export function generateStaticParams() {
  return Object.keys(PEOPLE).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/users/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: isPersonId(id) ? PEOPLE[id].fullName : "Profile not found" };
}

export default async function UserProfilePage({
  params,
}: PageProps<"/users/[id]">) {
  const { id } = await params;
  if (!isPersonId(id)) notFound();
  return <UserProfileScreen personId={id} />;
}
