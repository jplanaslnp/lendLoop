import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailsScreen } from "@/features/tools/ProductDetailsScreen";
import { getTool, TOOLS } from "@/mocks/tools";

/**
 * Known mock ids are prerendered; other ids are allowed to block (there is
 * no approved loading design for these pages yet).
 */
export const instant = false;

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ id: tool.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/tools/[id]">): Promise<Metadata> {
  const { id } = await params;
  const tool = getTool(id);
  return { title: tool ? tool.name : "Tool not found" };
}

export default async function ToolPage({ params }: PageProps<"/tools/[id]">) {
  const { id } = await params;
  const tool = getTool(id);
  if (!tool) notFound();
  return <ProductDetailsScreen tool={tool} />;
}
