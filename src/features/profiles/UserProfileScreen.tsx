"use client";

import Link from "next/link";

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  DesktopHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/config/navigation";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { cn } from "@/lib/cn";
import { useGoBack } from "@/lib/useGoBack";
import { avatarSrc, firstName, PEOPLE, type PersonId } from "@/mocks/people";
import { PUBLIC_PROFILES, toolImage } from "@/mocks/profiles";

import {
  HistoryList,
  ItemRowContent,
  ItemTile,
  PROFILE_CARD,
  ProfileMeta,
  SectionHeading,
} from "./ProfileParts";

/**
 * Public (read-only) profile of a neighbour, for signed-in users only.
 * Borrower identities in the activity list stay private.
 */
export function UserProfileScreen({ personId }: { personId: PersonId }) {
  const goBack = useGoBack();
  const person = PEOPLE[personId];
  const profile = PUBLIC_PROFILES[personId];
  const first = firstName(person);

  return (
    <div className="min-h-screen bg-sage pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-[72px]">
      <DesktopHeader />
      <MobileBrandHeader showAccount={false} />

      <RequireAuth>
        <main className="mx-auto box-border flex max-w-[1120px] flex-col gap-4 px-3.5 pt-[18px] md:gap-6 md:px-8 md:pt-8 xl:px-14">
          <div>
            <button
              type="button"
              onClick={goBack}
              className="flex h-[38px] items-center gap-2 rounded-full border border-solid border-[rgba(47,70,54,.08)] bg-surface pr-4 pl-3 text-sm font-semibold whitespace-nowrap text-forest hover:bg-white"
            >
              <Icon name="arrowLeft" size={16} strokeWidth={2.2} />
              Back
            </button>
          </div>

          <section
            aria-label="Public profile"
            className={cn(PROFILE_CARD, "flex items-center gap-4 md:gap-7")}
          >
            <span
              className="box-content size-[72px] flex-none rounded-full border-4 border-solid border-white bg-cover bg-center shadow-[0_4px_18px_-6px_rgba(47,70,54,.3)] md:size-[88px]"
              style={{ backgroundImage: `url(${avatarSrc(personId)})` }}
              role="img"
              aria-label={person.fullName}
            />
            <div className="flex min-w-0 flex-col gap-1.5 md:gap-2">
              <h1 className="mt-0 mb-1 text-[22px] leading-[1.1] font-extrabold tracking-tighter text-forest md:text-[32px]">
                {person.fullName}
              </h1>
              <ProfileMeta icon="building">
                {person.building} · Gent
              </ProfileMeta>
              <ProfileMeta icon="calendar">
                Member since {person.memberSince}
              </ProfileMeta>
            </div>
          </section>

          <section aria-label="Shared items" className={PROFILE_CARD}>
            <SectionHeading
              title={`Items shared by ${first}`}
              subtitle={`Objects ${first} is sharing with neighbors.`}
            />
            <div className="hidden grid-cols-2 gap-[22px] md:grid bp980:grid-cols-3">
              {profile.items.map((item) => (
                <Link
                  key={item.toolId}
                  href={ROUTES.tool(item.toolId)}
                  className="flex min-w-0 flex-col overflow-hidden rounded-card border border-solid border-[rgba(47,70,54,.08)] bg-surface text-forest shadow-card transition-[transform,box-shadow] duration-[250ms] ease-in-out hover:-translate-y-[3px] hover:text-forest hover:shadow-card-hover"
                >
                  <ItemTile
                    image={toolImage(item.image)}
                    name={item.name}
                    categoryLabel={item.categoryLabel}
                    available={item.available}
                  />
                </Link>
              ))}
            </div>
            <div className="flex flex-col md:hidden">
              {profile.items.map((item, i) => (
                <Link
                  key={item.toolId}
                  href={ROUTES.tool(item.toolId)}
                  className={cn(
                    "grid grid-cols-[72px_minmax(0,1fr)_auto_18px] items-center gap-3 py-2.5 text-forest hover:text-forest",
                    i > 0 &&
                      "border-t border-solid border-[rgba(47,70,54,.08)]",
                  )}
                >
                  <ItemRowContent
                    image={toolImage(item.image)}
                    name={item.name}
                    categoryLabel={item.categoryLabel}
                    available={item.available}
                  />
                  <Icon name="chevronRight" size={18} />
                </Link>
              ))}
            </div>
          </section>

          {profile.activity.length > 0 ? (
            <section aria-label="Sharing activity" className={PROFILE_CARD}>
              <SectionHeading
                title="Sharing activity"
                subtitle={`Recent loans of ${first}'s items. Borrower details stay private.`}
                icon="lend"
              />
              <HistoryList
                rows={profile.activity.map((a, i) => ({
                  key: `${a.name}-${i}`,
                  name: a.name,
                  image: toolImage(a.image),
                  meta: `Lent to a neighbor · ${a.when}`,
                  status: a.status,
                  statusLabel: a.status === "borrowed" ? "On loan" : undefined,
                }))}
              />
            </section>
          ) : null}
        </main>
      </RequireAuth>

      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}
