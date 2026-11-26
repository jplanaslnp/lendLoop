import { siteConfig } from "@/config/site";

/**
 * Phase 1 placeholder. The approved Explore screen replaces this in Phase 2.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-4xl font-extrabold tracking-tight text-primary">
        {siteConfig.name}
      </h1>
      <p className="text-lg font-medium">{siteConfig.tagline}</p>
    </main>
  );
}
