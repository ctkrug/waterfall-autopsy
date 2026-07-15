// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../chart", () => ({
  renderWaterfallChart: vi.fn(),
  destroyWaterfallChart: vi.fn(),
}));

describe("main — copy-status toast timeout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("doesn't revert a highlight applied while the 'Copied!' toast is showing", async () => {
    await import("../main");

    document.querySelector<HTMLButtonElement>(".sample-case-btn")!.click();
    document.querySelector<HTMLButtonElement>(".copy-report-btn")!.click();
    await vi.advanceTimersByTimeAsync(0); // flush the clipboard promise's re-render

    document.querySelector<HTMLButtonElement>(".offender-card")!.click();
    expect(document.querySelector(".offender-card.is-highlighted")).not.toBeNull();

    // The toast's own 1800ms auto-hide firing later must not clobber the
    // highlight applied after the toast was scheduled.
    await vi.advanceTimersByTimeAsync(1800);
    expect(document.querySelector(".offender-card.is-highlighted")).not.toBeNull();
  });

  it("doesn't stack a new auto-hide timer on every re-render while the toast is showing", async () => {
    await import("../main");

    document.querySelector<HTMLButtonElement>(".sample-case-btn")!.click();
    document.querySelector<HTMLButtonElement>(".copy-report-btn")!.click();
    await vi.advanceTimersByTimeAsync(0); // flush the clipboard promise's re-render
    expect(vi.getTimerCount()).toBe(1);

    // Any interaction while the toast is still showing re-renders with the
    // same copyStatus carried over — that must reuse/replace the pending
    // auto-hide timer, not pile up a second one alongside it.
    document.querySelector<HTMLButtonElement>(".offender-card")!.click();
    expect(vi.getTimerCount()).toBe(1);
  });
});
