// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@/test/render";
import { LanguageSwitcher } from "./language-switcher";
import * as nextNavigation from "next/navigation";

vi.mock("next/navigation");

describe("LanguageSwitcher", () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.mocked(nextNavigation.useRouter).mockReturnValue({
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.cookie = "";
  });

  it("should render FR and DE options", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent);

    expect(options).toContain("FR");
    expect(options).toContain("DE");
  });

  it("should have current locale selected", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("fr");
  });

  it("should set NEXT_LOCALE cookie when changing locale", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "de" } });

    // In jsdom, document.cookie contains the set cookie value
    expect(document.cookie).toBe("NEXT_LOCALE=de");
  });

  it("should call router.refresh() when locale changes", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "de" } });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("should render with correct aria-label from translations", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.getAttribute("aria-label")).toBe("Langue");
  });
});
