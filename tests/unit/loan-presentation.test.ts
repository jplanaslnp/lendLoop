import { describe, expect, it } from "vitest";

import {
  getActions,
  getBanner,
  getNeedsHint,
  getTimeline,
} from "@/features/loans/loanPresentation";
import { fromMock, type LoanView } from "@/features/loans/requestView";
import { MOCK_TODAY } from "@/mocks/people";
import { MOCK_REQUESTS } from "@/mocks/requests";

const byId = (id: string): LoanView => {
  const r = MOCK_REQUESTS.find((x) => x.id === id);
  if (!r) throw new Error(`missing ${id}`);
  return fromMock(r);
};

describe("loan presentation (UI copy from the design)", () => {
  it("shows owner actions for a pending incoming request", () => {
    const labels = getActions(byId("r1"), MOCK_TODAY).map((a) => a.label);
    expect(labels).toEqual(["Approve", "Decline", "Cancel Request"]);
  });

  it("shows borrower actions for an overdue loan", () => {
    const labels = getActions(byId("s5"), MOCK_TODAY).map((a) => a.label);
    expect(labels).toEqual([
      "Request Extension",
      "Mark as Returned",
      "See Product Details",
    ]);
  });

  it("describes overdue loans with days late", () => {
    const banner = getBanner(byId("s5"), MOCK_TODAY);
    expect(banner.title).toBe("Overdue");
    expect(banner.text).toBe(
      "Return was due Nov 24 · 2 days late. Return it or request an extension.",
    );
  });

  it("builds the timeline for a borrowed item", () => {
    const steps = getTimeline(byId("s4"), MOCK_TODAY);
    expect(steps.map((s) => s.kind)).toEqual([
      "done",
      "done",
      "done",
      "done",
      "current",
    ]);
    expect(steps[4]?.subtitle).toBe("Return by Dec 2");
  });

  it("ends a cancelled timeline with who cancelled", () => {
    const steps = getTimeline(byId("r8"), MOCK_TODAY);
    expect(steps.at(-1)).toMatchObject({
      title: "Cancelled by Marc",
      kind: "cancelled",
    });
  });

  it("flags requests that need the user's action", () => {
    expect(getNeedsHint(byId("r1"))).toBe("Respond to request");
    expect(getNeedsHint(byId("s2"))).toBe("Confirm pickup");
    expect(getNeedsHint(byId("s7"))).toBeNull();
  });
});
