import type {
  ListingOwnerDto,
  MemberListingCard,
  MemberListingDetail,
  PublicListingCard,
  PublicListingDetail,
} from "@convex/listings";

/** A photo slot: a real image, or the design's neutral placeholder. */
export type ToolPhoto =
  | { kind: "image"; src: string; label: string }
  | { kind: "placeholder"; label: string };

/** An Explore card as returned by Convex (`owner` only for members). */
export type ListingCard = PublicListingCard | MemberListingCard;

/** Product-page data as returned by Convex (`owner` only for members). */
export type ListingDetail = PublicListingDetail | MemberListingDetail;

export type ListingOwner = ListingOwnerDto;

/** The owner block, present only when Convex returned it (members). */
export function ownerOf(
  listing: ListingCard | ListingDetail,
): ListingOwner | null {
  return "owner" in listing ? listing.owner : null;
}

export function toToolPhotos(
  photos: readonly { src: string; label: string }[],
): ToolPhoto[] {
  return photos.map((p) => ({ kind: "image", src: p.src, label: p.label }));
}

/** "Patershol, Gent" → "Patershol" (the card's compact area label). */
export function areaName(locationLabel: string): string {
  return locationLabel.split(",")[0]?.trim() || locationLabel;
}
