import { describe, expect, it, vi } from "vitest";

const mockOcrProcess = vi.fn();
const mockExtractText = vi.fn();
const mockGetDocumentProxy = vi.fn();

vi.mock("@mistralai/mistralai", () => ({
  Mistral: class {
    ocr = { process: mockOcrProcess };
  },
}));

vi.mock("unpdf", () => ({
  extractText: (...args: unknown[]) => mockExtractText(...args),
  getDocumentProxy: (...args: unknown[]) => mockGetDocumentProxy(...args),
}));

describe("extractPdfText", () => {
  it("uses direct text extraction when PDF has embedded text", async () => {
    mockGetDocumentProxy.mockResolvedValueOnce({});
    mockExtractText.mockResolvedValueOnce({
      text: "Trepied 1 8 8 jour 20 € 160 € 160 €\nEquipement son 1 8 8 jour 70 € 560 €",
    });

    const { extractPdfText } = await import("./pdf-text");
    const result = await extractPdfText(new ArrayBuffer(10));

    expect(result).toContain("160 €");
    expect(result).toContain("560 €");
    expect(mockOcrProcess).not.toHaveBeenCalled();
  });

  it("falls back to Mistral OCR when direct extraction yields no text", async () => {
    mockGetDocumentProxy.mockResolvedValueOnce({});
    mockExtractText.mockResolvedValueOnce({ text: "" });
    mockOcrProcess.mockResolvedValueOnce({
      pages: [
        { markdown: "# Page 1\n\n| Poste | Montant |\n|---|---|\n| Réalisateur | 5000 |" },
      ],
    });

    const { extractPdfText } = await import("./pdf-text");
    const result = await extractPdfText(new ArrayBuffer(10));

    expect(result).toContain("Réalisateur");
    expect(mockOcrProcess).toHaveBeenCalled();
  });

  it("falls back to Mistral OCR when direct extraction fails", async () => {
    mockGetDocumentProxy.mockRejectedValueOnce(new Error("parse error"));
    mockOcrProcess.mockResolvedValueOnce({
      pages: [{ markdown: "OCR fallback content" }],
    });

    const { extractPdfText } = await import("./pdf-text");
    const result = await extractPdfText(new ArrayBuffer(10));

    expect(result).toContain("OCR fallback content");
  });
});
