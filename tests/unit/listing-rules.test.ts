import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { detectImageFormat } from "@convex/lib/imageFormat";
import { areaProblem, listingTextProblems } from "@convex/lib/listingRules";

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(join(__dirname, "..", "fixtures", "images", name)),
  );

describe("areaProblem", () => {
  it.each([
    "Patershol, Gent",
    "Sint-Pieters, Gent",
    "District 9, Gent",
    "Paris 15e",
    "Zone 3, Leuven",
    "L'Hospitalet de Llobregat",
    "Gràcia, Barcelona",
    "Rue des Fleurs, Brussels",
    "Söder, Stockholm",
    "Muide-Meulestede (Gent)",
  ])("allows %s", (area) => {
    expect(areaProblem(area)).toBeNull();
  });

  it.each([
    ["G", "too short"],
    ["x".repeat(61), "too long"],
    ["Veldstraat 12, Gent", "street + number"],
    ["Kerkstraat 5", "street suffix + number"],
    ["12 Main Street", "number + street word"],
    ["Calle Mayor 3", "calle + number"],
    ["9000 Gent", "postcode"],
    ["Gent 9000", "postcode"],
    ["1012 AB Amsterdam", "Dutch postcode"],
    ["SW1A 1AA London", "UK postcode"],
    ["Patershol, apartment 4", "apartment"],
    ["3rd floor, Gent", "floor"],
    ["Building A, Gent", "building"],
    ["Piso 2, Madrid", "piso"],
    ["Bus 3, Gent", "bus"],
    ["Nº 7 Gent", "number marker"],
    ["#12 Gent", "hash"],
    ["51.05, 3.72", "coordinates"],
    ["51°03' N", "degrees"],
    ["Gent\nPatershol", "line break"],
    ["<b>Gent</b>", "markup"],
  ])("rejects %s (%s)", (area) => {
    expect(areaProblem(area)).not.toBeNull();
  });

  it("documents what it cannot catch", () => {
    // No street word and a short number: indistinguishable from "Zone 5".
    expect(areaProblem("Main 5")).toBeNull();
  });
});

describe("listingTextProblems", () => {
  it("returns a message per invalid field", () => {
    expect(
      listingTextProblems({ name: "", description: "short", area: "" }),
    ).toEqual({
      name: "Add a name for your item.",
      description: "Add a little more detail (at least 15 characters).",
      area: "Add the neighbourhood and city.",
    });
    expect(
      listingTextProblems({
        name: "Drill",
        description: "A good cordless drill.",
        area: "Patershol, Gent",
      }),
    ).toEqual({});
  });
});

describe("detectImageFormat", () => {
  it.each([
    ["pixel.jpg", "jpeg"],
    ["drill-small.jpg", "jpeg"],
    ["pixel.png", "png"],
    ["pixel.webp", "webp"],
  ])("detects %s as %s", (file, format) => {
    expect(detectImageFormat(fixture(file))).toBe(format);
  });

  it.each(["fake-html.jpg", "fake.pdf", "fake.svg"])("rejects %s", (file) => {
    expect(detectImageFormat(fixture(file))).toBeNull();
  });

  it("rejects truncated and look-alike headers", () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(
      detectImageFormat(new TextEncoder().encode("RIFF1234WAVEfmt ")),
    ).toBeNull();
    expect(detectImageFormat(new Uint8Array())).toBeNull();
  });
});
