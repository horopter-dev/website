import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { afterEach, describe, expect, it } from "vitest";

const source = readFileSync(new URL("../public/theme.js", import.meta.url), "utf8");

const toggle = `<div data-theme-toggle hidden>
<button data-theme-choice="system" aria-label="System theme"></button>
<button data-theme-choice="light" aria-label="Light theme"></button>
<button data-theme-choice="dark" aria-label="Dark theme"></button>
</div>`;

const windows: Window[] = [];

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

interface Page {
  window: Window;
  setSystemDark: (dark: boolean) => void;
}

function systemColourScheme(window: Window, dark: boolean): (dark: boolean) => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  let matches = dark;
  Object.defineProperty(query, "matches", { get: () => matches });
  window.matchMedia = () => query;
  return (next) => {
    matches = next;
    query.dispatchEvent(new window.Event("change"));
  };
}

function load(options: { stored?: string; systemDark?: boolean; body?: string } = {}): Page {
  const window = new Window({ url: "https://www.horopter.dev/" });
  windows.push(window);
  window.document.body.innerHTML = options.body ?? "";
  if (options.stored !== undefined) {
    window.localStorage.setItem("theme", options.stored);
  }
  const setSystemDark = systemColourScheme(window, options.systemDark ?? false);
  new Function("window", "document", source)(window, window.document);
  return { window, setSystemDark };
}

function applied(page: Page): { classes: string; colorScheme: string } {
  const root = page.window.document.documentElement;
  return { classes: root.className, colorScheme: root.style.colorScheme };
}

function pressed(page: Page): string[] {
  const buttons = page.window.document.querySelectorAll("[data-theme-choice]");
  return Array.from(buttons)
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.getAttribute("data-theme-choice") ?? "");
}

function click(page: Page, choice: string): void {
  const button = page.window.document.querySelector(`[data-theme-choice="${choice}"]`);
  button?.dispatchEvent(new page.window.MouseEvent("click", { bubbles: true }));
}

describe("theme.js", () => {
  it("follows a light system setting when nothing is stored", () => {
    expect(applied(load())).toEqual({ classes: "light", colorScheme: "light" });
  });

  it("follows a dark system setting when nothing is stored", () => {
    expect(applied(load({ systemDark: true }))).toEqual({ classes: "dark", colorScheme: "dark" });
  });

  it("applies a stored choice over the system setting", () => {
    expect(applied(load({ stored: "dark" }))).toEqual({ classes: "dark", colorScheme: "dark" });
    expect(applied(load({ stored: "light", systemDark: true }))).toEqual({
      classes: "light",
      colorScheme: "light",
    });
  });

  it("treats an unknown stored value as system", () => {
    expect(applied(load({ stored: "sepia", systemDark: true }))).toEqual({
      classes: "dark",
      colorScheme: "dark",
    });
  });

  it("follows the system setting live while the choice is system", () => {
    const page = load();
    page.setSystemDark(true);
    expect(applied(page)).toEqual({ classes: "dark", colorScheme: "dark" });
  });

  it("ignores the system setting while the choice is explicit", () => {
    const page = load({ stored: "light" });
    page.setSystemDark(true);
    expect(applied(page)).toEqual({ classes: "light", colorScheme: "light" });
  });

  it("applies a choice made in another tab", () => {
    const page = load({ body: toggle });
    const { window } = page;
    window.dispatchEvent(new window.StorageEvent("storage", { key: "theme", newValue: "dark" }));
    expect(applied(page)).toEqual({ classes: "dark", colorScheme: "dark" });
    expect(pressed(page)).toEqual(["dark"]);
  });

  it("returns to system when another tab clears the choice", () => {
    const page = load({ stored: "dark", body: toggle });
    const { window } = page;
    window.dispatchEvent(new window.StorageEvent("storage", { key: "theme" }));
    expect(applied(page)).toEqual({ classes: "light", colorScheme: "light" });
    expect(pressed(page)).toEqual(["system"]);
  });

  it("shows the toggle with the current choice pressed", () => {
    const page = load({ stored: "light", body: toggle });
    const container = page.window.document.querySelector("[data-theme-toggle]");
    expect(container?.hasAttribute("hidden")).toBe(false);
    expect(pressed(page)).toEqual(["light"]);
  });

  it("stores and applies a choice made with the toggle", () => {
    const page = load({ body: toggle });
    click(page, "dark");
    expect(applied(page)).toEqual({ classes: "dark", colorScheme: "dark" });
    expect(page.window.localStorage.getItem("theme")).toBe("dark");
    expect(pressed(page)).toEqual(["dark"]);
    click(page, "system");
    expect(applied(page)).toEqual({ classes: "light", colorScheme: "light" });
    expect(page.window.localStorage.getItem("theme")).toBe("system");
  });

  it("wires the toggle once the document has loaded", () => {
    const window = new Window({ url: "https://www.horopter.dev/" });
    windows.push(window);
    systemColourScheme(window, false);
    Object.defineProperty(window.document, "readyState", { value: "loading", configurable: true });
    new Function("window", "document", source)(window, window.document);
    window.document.body.innerHTML = toggle;
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    expect(pressed({ window, setSystemDark: () => undefined })).toEqual(["system"]);
  });

  it("follows the system setting when storage is unavailable", () => {
    const window = new Window({ url: "https://www.horopter.dev/" });
    windows.push(window);
    systemColourScheme(window, true);
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new Error("storage is disabled");
      },
    });
    new Function("window", "document", source)(window, window.document);
    expect(window.document.documentElement.className).toBe("dark");
  });
});
