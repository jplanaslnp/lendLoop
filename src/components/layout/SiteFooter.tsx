import Link from "next/link";

import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";

import { Logo } from "./Logo";

/**
 * Public footer. Community/Help/legal pages do not exist yet (open decision in
 * docs/DECISIONS.md), so those links are placeholders.
 */
const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Browse tools", href: ROUTES.explore },
      { label: "Categories", href: ROUTES.explore },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "How it works", href: "#" },
      { label: "Community guidelines", href: "#" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact us", href: "#" },
      { label: "FAQs", href: "#" },
    ],
  },
] as const;

const LINK = "text-[15px] text-ink-link hover:text-primary";

export function SiteFooter() {
  return (
    <div className="mx-auto box-border max-w-[1440px] px-3.5 pb-6 md:px-8 xl:px-14">
      <footer className="mx-auto mt-10 box-border max-w-[1440px] text-forest md:mt-16">
        <div className="rounded-[20px] border border-solid border-[rgba(47,70,54,.07)] bg-surface px-5 py-6 shadow-[0_1px_2px_rgba(47,70,54,.04)] md:rounded-[24px] md:px-8 md:pt-9 md:pb-7 xl:px-14 xl:pt-11 xl:pb-8">
          <div className="grid grid-cols-1 items-start gap-6 md:gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)]">
            <div className="flex min-w-0 flex-col gap-3.5 xl:border-r xl:border-solid xl:border-[rgba(47,70,54,.12)] xl:pr-10">
              <Logo variant="footer" />
              <p className="m-0 max-w-[320px] text-[15px] leading-normal text-pretty text-ink-muted md:text-[17px]">
                A little sharing makes our neighbourhood a better place.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-[22px] md:grid-cols-3 md:gap-6">
              {COLUMNS.map((col) => (
                <nav
                  key={col.title}
                  aria-label={col.title}
                  className="flex flex-col gap-3"
                >
                  <span className="text-base font-extrabold text-forest">
                    {col.title}
                  </span>
                  {col.links.map((link) =>
                    link.href === "#" ? (
                      <a key={link.label} href="#" className={LINK}>
                        {link.label}
                      </a>
                    ) : (
                      <Link key={link.label} href={link.href} className={LINK}>
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>
              ))}
            </div>
          </div>
          <div className="mt-[22px] mb-4 h-px bg-[rgba(47,70,54,.12)] md:mt-8 md:mb-5" />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
            <span>© 2026 {siteConfig.name}</span>
            <div className="flex items-center gap-3">
              <a href="#" className="text-ink-link hover:text-primary">
                Privacy Policy
              </a>
              <span className="size-1 rounded-full bg-ink-faint" aria-hidden />
              <a href="#" className="text-ink-link hover:text-primary">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
