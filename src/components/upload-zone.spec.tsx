// @vitest-environment jsdom
import { render, screen } from "@/test/render";
import { describe, expect, it, vi } from "vitest";

import { UploadZone, validatePdfFile } from "./upload-zone";

function createPdfFile(name = "devis.pdf", sizeMB = 1) {
  const bytes = new Uint8Array(sizeMB * 1024 * 1024);
  return new File([bytes], name, { type: "application/pdf" });
}

describe("validatePdfFile", () => {
  it("should accept a valid PDF file", () => {
    const result = validatePdfFile(createPdfFile());
    expect(result).toBeNull();
  });

  it("should reject non-PDF files", () => {
    const file = new File(["content"], "doc.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = validatePdfFile(file);
    expect(result).toBe("invalidType");
  });

  it("should reject files over 20MB", () => {
    const file = createPdfFile("big.pdf", 21);
    const result = validatePdfFile(file);
    expect(result).toBe("tooLarge");
  });
});

describe("UploadZone", () => {
  it("should render the drop zone with instructions", () => {
    render(<UploadZone onFileSelected={vi.fn()} />);
    expect(screen.getByText(/Glissez un devis PDF/)).toBeDefined();
    expect(screen.getByText(/PDF, max 20 Mo/)).toBeDefined();
  });

  it("should render with file accept attribute for PDF", () => {
    render(<UploadZone onFileSelected={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe("application/pdf");
  });

  it("should show disabled state", () => {
    const { container } = render(<UploadZone onFileSelected={vi.fn()} disabled />);
    const card = container.querySelector("[data-slot='card']");
    expect(card?.className).toContain("opacity-60");
  });
});
