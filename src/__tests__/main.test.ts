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

describe("main — untrusted HAR content rendering", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("escapes an XSS payload embedded in a HAR request URL instead of rendering it as markup", async () => {
    await import("../main");

    const maliciousUrl = 'https://evil.example.com/"><img src=x onerror=alert(1)>.js';
    const har = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          {
            startedDateTime: "2026-01-01T00:00:00.000Z",
            time: 10,
            request: { method: "GET", url: maliciousUrl },
            response: {
              status: 200,
              content: { size: 100, mimeType: "application/javascript" },
              headersSize: 0,
              bodySize: 0,
            },
          },
        ],
      },
    });
    const file = new File([har], "evil.har", { type: "application/json" });
    const input = document.querySelector<HTMLInputElement>("#har-input")!;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change"));

    await vi.advanceTimersByTimeAsync(50); // flush file.text() + the rAF yield in openCase()

    expect(document.querySelector(".offender-card img")).toBeNull();
    expect(document.querySelector(".offender-card .url")?.textContent).toBe(maliciousUrl);
  });
});

describe("main — recovering from a loaded case", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prevents the browser's default navigate-away when a file is dropped outside the dropzone", async () => {
    await import("../main");
    document.querySelector<HTMLButtonElement>(".sample-case-btn")!.click();

    // Once a report is loaded there's no dropzone in the DOM at all, so a
    // dropped file necessarily lands on some other element (or the window).
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    window.dispatchEvent(dropEvent);
    expect(dropEvent.defaultPrevented).toBe(true);

    const dragoverEvent = new Event("dragover", { bubbles: true, cancelable: true });
    window.dispatchEvent(dragoverEvent);
    expect(dragoverEvent.defaultPrevented).toBe(true);
  });

  it("offers a way to open a new case once a report is already loaded", async () => {
    await import("../main");
    document.querySelector<HTMLButtonElement>(".sample-case-btn")!.click();
    expect(document.querySelector("#har-input")).toBeNull(); // the dropzone/input is gone

    const resetControl = document.querySelector<HTMLButtonElement>(".new-case-btn");
    expect(resetControl).not.toBeNull();
    resetControl!.click();

    expect(document.querySelector("#har-input")).not.toBeNull();
    expect(document.querySelector(".offender-card")).toBeNull();
  });
});
