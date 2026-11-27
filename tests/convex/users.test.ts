// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "@convex/_generated/api";
import schema from "@convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

const alice = {
  subject: "user_alice",
  issuer: "https://example.clerk.accounts.dev",
  name: "Alice Example",
  email: "Alice@Example.com",
  emailVerified: true,
};

describe("users (Clerk identity bridge)", () => {
  it("rejects signed-out callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.ensureCurrent, {})).rejects.toThrow(
      /sign in/i,
    );
    expect(await t.query(api.users.current, {})).toBeNull();
  });

  it("creates the profile from the verified token with safe defaults", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(alice);
    const id = await asAlice.mutation(api.users.ensureCurrent, {});
    expect(await asAlice.query(api.users.current, {})).toMatchObject({
      id,
      name: "Alice Example",
      email: "alice@example.com",
      role: "user",
      isTrustedLender: false,
    });
  });

  it("is idempotent and refreshes the name from the token", async () => {
    const t = convexTest(schema, modules);
    const first = await t
      .withIdentity(alice)
      .mutation(api.users.ensureCurrent, {});
    const again = await t
      .withIdentity({ ...alice, name: "Alice Renamed" })
      .mutation(api.users.ensureCurrent, {});
    expect(again).toBe(first);
    const rows = await t.run((ctx) => ctx.db.query("users").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Alice Renamed");
  });

  it("keeps a stored admin role and never lets the token change it", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(alice);
    const id = await asAlice.mutation(api.users.ensureCurrent, {});
    await t.run((ctx) => ctx.db.patch(id, { role: "admin" }));
    await asAlice.mutation(api.users.ensureCurrent, {});
    expect((await asAlice.query(api.users.current, {}))?.role).toBe("admin");
  });

  it("only returns the caller's own profile", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(alice).mutation(api.users.ensureCurrent, {});
    const asBob = t.withIdentity({ subject: "user_bob", name: "Bob" });
    expect(await asBob.query(api.users.current, {})).toBeNull();
  });

  it("ignores an unverified email and hides disabled accounts", async () => {
    const t = convexTest(schema, modules);
    const asEve = t.withIdentity({
      subject: "user_eve",
      email: "eve@example.com",
      emailVerified: false,
    });
    const id = await asEve.mutation(api.users.ensureCurrent, {});
    expect((await asEve.query(api.users.current, {}))?.email).toBeNull();
    await t.run((ctx) => ctx.db.patch(id, { disabledAt: Date.now() }));
    expect(await asEve.query(api.users.current, {})).toBeNull();
    await expect(asEve.mutation(api.users.ensureCurrent, {})).rejects.toThrow(
      /disabled/i,
    );
  });
});
