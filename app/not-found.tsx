import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <p>
        <Link href="/" className="font-semibold text-primary underline">
          Go to the home page
        </Link>
      </p>
    </main>
  );
}
