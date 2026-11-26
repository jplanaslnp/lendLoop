import { describe, expect, it } from "vitest";

import { validateAuth } from "@/features/auth/AuthModal";
import { validateShareForm } from "@/features/share/shareForm";

const emptyAuth = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  address: "",
  terms: false,
};

describe("auth modal validation (UI)", () => {
  it("requires email and password to sign in", () => {
    expect(validateAuth("signin", emptyAuth)).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });

  it("validates every sign-up field", () => {
    const errors = validateAuth("signup", {
      ...emptyAuth,
      email: "not-an-email",
      password: "short",
      confirm: "other",
    });
    expect(errors).toEqual({
      email: "Enter a valid email address.",
      name: "Enter your full name.",
      password: "Use at least 8 characters.",
      confirm: "Passwords don’t match.",
      address: "Add your building, floor and neighbourhood.",
      terms: "Please accept the Terms of Service and Privacy Policy.",
    });
  });

  it("accepts a complete sign-up form", () => {
    expect(
      validateAuth("signup", {
        name: "Test User",
        email: "test@example.com",
        password: "longenough",
        confirm: "longenough",
        address: "Building A",
        terms: true,
      }),
    ).toEqual({});
  });
});

describe("share a tool validation (UI)", () => {
  it("reports every missing field", () => {
    expect(
      validateShareForm({
        name: " ",
        category: "",
        condition: "",
        description: "",
        photoCount: 0,
      }),
    ).toEqual({
      name: "Add a name for your item.",
      category: "Choose a category.",
      condition: "Select the condition.",
      description: "Add a short description.",
      photos: "Add at least one photo.",
    });
  });

  it("asks for a longer description", () => {
    expect(
      validateShareForm({
        name: "Drill",
        category: "diy",
        condition: "good",
        description: "Too short",
        photoCount: 1,
      }),
    ).toEqual({
      description: "Add a little more detail (at least 15 characters).",
    });
  });
});
