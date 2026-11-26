"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useState, type MouseEvent } from "react";

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  DesktopHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/config/navigation";
import { useAuthUi } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { UserAvatar } from "@/features/auth/UserAvatar";
import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { cn } from "@/lib/cn";
import { MOCK_CURRENT_USER } from "@/mocks/people";
import {
  BORROWING_HISTORY,
  LENDING_HISTORY,
  MY_ITEMS,
  ON_LOAN_STATUSES,
  toolImage,
  type MyItem,
} from "@/mocks/profiles";

import {
  HistoryList,
  ItemRowContent,
  ItemTile,
  PROFILE_CARD,
  ProfileMeta,
  SectionHeading,
} from "./ProfileParts";

const ON_LOAN_IDS = new Set(
  LENDING_HISTORY.filter((r) => ON_LOAN_STATUSES.includes(r.status)).map(
    (r) => r.itemId,
  ),
);

type ModalState =
  | { kind: "remove"; item: MyItem }
  | { kind: "logout" }
  | { kind: "edit" }
  | null;

const INPUT =
  "box-border h-[50px] rounded-field border border-solid border-[rgba(47,70,54,.18)] bg-white px-4 text-base font-medium text-forest outline-none focus:border-primary focus:shadow-focus";

/** My Profile — account summary, my listings and loan histories (mock). */
export function MyProfileScreen() {
  const { signOut } = useAuthUi();
  const user = useCurrentUser();
  const { user: clerkUser } = useUser();
  const toast = useToast(3200);
  const [items, setItems] = useState<readonly MyItem[]>(MY_ITEMS);
  const [menu, setMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  // Building is mock data until the Convex profile exists (Phase 4).
  const [building, setBuilding] = useState<string>(
    MOCK_CURRENT_USER.buildingDetail,
  );
  const [draft, setDraft] = useState({ name: "", building });
  const [saving, setSaving] = useState(false);
  const name = user?.fullName ?? "";

  const toggleMenu = (id: string) => (event: MouseEvent) => {
    event.stopPropagation();
    setMenu((m) => (m === id ? null : id));
  };

  const confirm = () => {
    if (!modal) return;
    if (modal.kind === "remove") {
      setItems((list) => list.filter((i) => i.id !== modal.item.id));
      setModal(null);
      toast.show(`${modal.item.name} removed from your listings.`);
    } else if (modal.kind === "logout") {
      setModal(null);
      void signOut();
    } else {
      void saveProfile();
    }
  };

  /** Name is saved to the Clerk account; building stays local (mock). */
  const saveProfile = async () => {
    const nextName = draft.name.trim();
    if (!nextName || saving) return;
    setSaving(true);
    try {
      if (clerkUser && nextName !== name) {
        const [firstName = "", ...rest] = nextName.split(/\s+/);
        await clerkUser.update({ firstName, lastName: rest.join(" ") });
      }
      setBuilding(draft.building.trim() || building);
      setModal(null);
      toast.show("Profile updated.");
    } catch {
      toast.show("Couldn’t update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const itemMenu = (item: MyItem, mobile: boolean) => {
    const locked = ON_LOAN_IDS.has(item.id);
    const row = cn(
      "flex items-center gap-2.5 rounded-[10px] px-3 text-[14.5px] font-semibold",
      mobile ? "h-11" : "h-[42px]",
    );
    return (
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute z-10 box-content w-[210px] rounded-[14px] border border-solid border-[rgba(47,70,54,.1)] bg-white p-1.5 shadow-menu",
          mobile ? "top-14 right-0" : "right-3 bottom-16",
        )}
      >
        <Link
          href={ROUTES.share}
          role="menuitem"
          className={cn(
            row,
            "text-forest hover:bg-lavender-soft hover:text-forest",
          )}
        >
          <Icon name="pencil" size={17} />
          Edit listing
        </Link>
        <Link
          href={ROUTES.explore}
          role="menuitem"
          className={cn(
            row,
            "text-forest hover:bg-lavender-soft hover:text-forest",
          )}
        >
          <Icon name="eye" size={17} />
          View in Explore
        </Link>
        <div className="mx-1.5 my-1 h-px bg-[rgba(47,70,54,.08)]" />
        <button
          type="button"
          role="menuitem"
          disabled={locked}
          onClick={() => {
            if (locked) return;
            setMenu(null);
            setModal({ kind: "remove", item });
          }}
          className={cn(
            row,
            "w-full border-none bg-transparent text-left",
            locked
              ? "text-ink-disabled"
              : "text-danger hover:bg-danger-hover-bg",
          )}
        >
          <Icon name="trash" size={17} />
          {locked ? "Can’t remove while on loan" : "Remove listing"}
        </button>
      </div>
    );
  };

  const menuButton = (item: MyItem, mobile: boolean) => (
    <button
      type="button"
      onClick={toggleMenu(item.id)}
      aria-label={`Actions for ${item.name}`}
      aria-expanded={menu === item.id}
      aria-haspopup="menu"
      className={cn(
        "flex flex-none items-center justify-center border-none text-forest hover:bg-hover-sage",
        mobile ? "h-11 w-10 rounded-field" : "size-10 rounded-full",
        menu === item.id ? "bg-hover-sage" : "bg-transparent",
      )}
    >
      <Icon name="dots" size={20} />
    </button>
  );

  return (
    <div
      className="min-h-screen bg-sage pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-[72px]"
      onClick={() => menu && setMenu(null)}
    >
      <DesktopHeader active="profile" />
      <MobileBrandHeader showAccount={false} />

      <RequireAuth>
        <main className="mx-auto box-border flex max-w-[1120px] flex-col gap-4 px-3.5 pt-[22px] md:gap-6 md:px-8 md:pt-9 xl:px-14">
          <div>
            <h1 className="m-0 text-[34px] leading-[1.05] font-extrabold tracking-tightest text-forest md:text-[44px]">
              My Profile
            </h1>
            <p className="mt-2.5 mb-0 text-[15px] leading-[1.45] text-ink-muted md:text-[17px]">
              Manage your profile, items and activity.
            </p>
          </div>

          <section
            aria-label="Profile"
            className={cn(
              PROFILE_CARD,
              "flex flex-col items-stretch gap-[18px] md:gap-6 bp900:flex-row bp900:items-center",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-7">
              <span className="box-content size-[84px] flex-none overflow-hidden rounded-full border-4 border-solid border-white shadow-[0_4px_18px_-6px_rgba(47,70,54,.3)] md:size-[124px]">
                <UserAvatar user={user} alt={name} size={124} fluid priority />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5 md:gap-2">
                <h2 className="mt-0 mb-1 text-[21px] leading-[1.1] font-extrabold tracking-tighter text-forest md:text-[30px]">
                  {name}
                </h2>
                {user?.email ? (
                  <ProfileMeta icon="mail">{user.email}</ProfileMeta>
                ) : null}
                <ProfileMeta icon="building">{building}</ProfileMeta>
                {user?.memberSince ? (
                  <ProfileMeta icon="calendar">
                    Member since {user.memberSince}
                  </ProfileMeta>
                ) : null}
              </div>
            </div>
            <div className="flex w-full flex-none flex-row gap-3 bp900:w-[220px] bp900:flex-col">
              <button
                type="button"
                onClick={() => {
                  setDraft({ name, building });
                  setModal({ kind: "edit" });
                }}
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2.5 rounded-full border-[1.5px] border-solid border-primary bg-primary px-[26px] text-base font-bold whitespace-nowrap text-white hover:bg-lavender hover:text-primary-deep md:min-h-[50px] md:bg-surface md:text-primary"
              >
                <Icon name="edit" size={19} />
                Edit profile
              </button>
              <Button
                variant="neutral"
                onClick={() => setModal({ kind: "logout" })}
                className="min-h-[46px] flex-1 gap-2.5 px-[26px] text-base font-semibold md:min-h-[50px]"
              >
                <Icon name="logout" size={19} />
                Log out
              </Button>
            </div>
          </section>

          <section aria-label="My Items" className={PROFILE_CARD}>
            <SectionHeading
              title="My Items"
              subtitle="The objects you're sharing with your neighbors."
              action={
                <Link
                  href={ROUTES.share}
                  className="flex h-10 flex-none items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold whitespace-nowrap text-white shadow-primary hover:bg-primary-hover hover:text-white md:h-12 md:px-6 md:text-base"
                >
                  <Icon name="plus" size={18} strokeWidth={2.2} />
                  Add item
                </Link>
              }
            />

            {items.length > 0 ? (
              <>
                <div className="hidden grid-cols-2 gap-[22px] md:grid bp980:grid-cols-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="relative flex min-w-0 flex-col rounded-card border border-solid border-[rgba(47,70,54,.08)] bg-surface shadow-card transition-[transform,box-shadow] duration-[250ms] ease-in-out hover:-translate-y-[3px] hover:shadow-card-hover"
                    >
                      <ItemTile
                        image={toolImage(item.image)}
                        name={item.name}
                        categoryLabel={item.categoryLabel}
                        available={!ON_LOAN_IDS.has(item.id)}
                      >
                        {menuButton(item, false)}
                      </ItemTile>
                      {menu === item.id ? itemMenu(item, false) : null}
                    </article>
                  ))}
                </div>
                <div className="flex flex-col md:hidden">
                  {items.map((item, i) => (
                    <div
                      key={item.id}
                      className={cn(
                        "relative grid grid-cols-[72px_minmax(0,1fr)_auto_40px] items-center gap-3 py-2.5",
                        i > 0 &&
                          "border-t border-solid border-[rgba(47,70,54,.08)]",
                      )}
                    >
                      <ItemRowContent
                        image={toolImage(item.image)}
                        name={item.name}
                        categoryLabel={item.categoryLabel}
                        available={!ON_LOAN_IDS.has(item.id)}
                      />
                      {menuButton(item, true)}
                      {menu === item.id ? itemMenu(item, true) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="You're not sharing anything yet"
                description="Add your first item so neighbors can borrow it."
                className="rounded-2xl px-5 py-10"
                titleClassName="text-base"
                descriptionClassName="mt-1.5 text-sm"
              />
            )}
          </section>

          {[
            {
              title: "Lending History",
              subtitle: "Objects you've lent to your neighbors.",
              icon: "lend" as const,
              href: ROUTES.lending,
              link: "View all in Lending",
              rows: LENDING_HISTORY.map((r, i) => ({
                key: `lent-${i}`,
                name: r.name,
                image: toolImage(r.image),
                meta: `To ${r.who}`,
                status: r.status,
                dates: r.dates,
              })),
            },
            {
              title: "Borrowing History",
              subtitle: "Objects you've borrowed from your neighbors.",
              icon: "borrow" as const,
              href: ROUTES.borrowing,
              link: "View all in Borrowing",
              rows: BORROWING_HISTORY.map((r, i) => ({
                key: `borrowed-${i}`,
                name: r.name,
                image: toolImage(r.image),
                meta: `From ${r.who}`,
                status: r.status,
                dates: r.dates,
              })),
            },
          ].map((h) => (
            <section
              key={h.title}
              aria-label={h.title}
              className={PROFILE_CARD}
            >
              <SectionHeading
                title={h.title}
                subtitle={h.subtitle}
                icon={h.icon}
                action={
                  <Link
                    href={h.href}
                    className="hidden h-10 flex-none items-center gap-1 rounded-full pr-1.5 pl-3.5 text-[15px] font-bold whitespace-nowrap text-primary hover:bg-lavender-soft md:flex"
                  >
                    {h.link}
                    <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                  </Link>
                }
              />
              <HistoryList rows={h.rows} href={h.href} />
              <Link
                href={h.href}
                className="mt-2.5 flex min-h-11 items-center justify-center gap-1 rounded-full text-[14.5px] font-bold text-primary md:hidden"
              >
                {h.link}
                <Icon name="chevronRight" size={17} strokeWidth={2.2} />
              </Link>
            </section>
          ))}
        </main>
      </RequireAuth>

      <MobileBottomNav active="profile" />

      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        label={
          modal?.kind === "remove"
            ? `Remove ${modal.item.name.toLowerCase()}?`
            : modal?.kind === "logout"
              ? "Log out?"
              : "Edit profile"
        }
      >
        {modal ? (
          <>
            <h3 className="m-0 text-[22px] font-extrabold tracking-tight text-forest">
              {modal.kind === "remove"
                ? `Remove ${modal.item.name.toLowerCase()}?`
                : modal.kind === "logout"
                  ? "Log out?"
                  : "Edit profile"}
            </h3>
            {modal.kind !== "edit" ? (
              <p className="mt-2.5 mb-0 text-[15px] leading-normal text-pretty text-ink-muted">
                {modal.kind === "remove"
                  ? "It will disappear from Explore. Past loans stay in your lending history."
                  : "You can log back in anytime. Your items and loans stay as they are."}
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-[15px] font-bold text-forest">
                  Full name
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    className={INPUT}
                  />
                </label>
                <label className="flex flex-col gap-2 text-[15px] font-bold text-forest">
                  Building and floor
                  <input
                    value={draft.building}
                    onChange={(e) =>
                      setDraft({ ...draft, building: e.target.value })
                    }
                    className={INPUT}
                  />
                </label>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button
                variant="neutral"
                onClick={() => setModal(null)}
                className="min-h-[50px] flex-[1_1_140px] text-[15px] font-bold"
              >
                {modal.kind === "remove"
                  ? "Keep listing"
                  : modal.kind === "logout"
                    ? "Stay"
                    : "Cancel"}
              </Button>
              <Button
                variant={modal.kind === "remove" ? "danger" : "primaryFlat"}
                onClick={confirm}
                disabled={modal.kind === "edit" && saving}
                className="min-h-[50px] flex-[1_1_160px] text-[15px] font-bold"
              >
                {modal.kind === "remove"
                  ? "Remove"
                  : modal.kind === "logout"
                    ? "Log out"
                    : "Save changes"}
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>

      <Toast
        message={toast.message}
        icon="check"
        className="bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-8"
      />
    </div>
  );
}
