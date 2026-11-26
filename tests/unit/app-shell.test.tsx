import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";
import NotFound from "../../app/not-found";
import { siteConfig } from "@/config/site";

describe("site config", () => {
  it("uses the LendLoop product identity", () => {
    expect(siteConfig.name).toBe("LendLoop");
    expect(siteConfig.tagline).toBe(
      "Borrow what you need. Lend what you don’t.",
    );
  });
});

describe("app shell", () => {
  it("renders the product name and tagline on the home page", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "LendLoop" }),
    ).toBeInTheDocument();
    expect(screen.getByText(siteConfig.tagline)).toBeInTheDocument();
  });

  it("renders a not-found page with a link home", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to the home page" }),
    ).toHaveAttribute("href", "/");
  });
});
