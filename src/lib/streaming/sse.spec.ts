import { describe, expect, it } from "vitest";
import { sseData, sseEvent, sseComment, SSEParser } from "./sse";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("sseData", () => {
  it("encodes single-line data", () => {
    expect(decode(sseData("hello"))).toBe("data: hello\n\n");
  });

  it("encodes multi-line data as separate data fields", () => {
    expect(decode(sseData("line1\nline2"))).toBe("data: line1\ndata: line2\n\n");
  });
});

describe("sseEvent", () => {
  it("encodes a named event", () => {
    expect(decode(sseEvent("hash", "abc123"))).toBe("event: hash\ndata: abc123\n\n");
  });
});

describe("sseComment", () => {
  it("encodes a keepalive comment", () => {
    expect(decode(sseComment())).toBe(":\n\n");
  });
});

describe("SSEParser", () => {
  it("parses a single data event", () => {
    const parser = new SSEParser();
    const events = parser.feed("data: hello\n\n");
    expect(events).toEqual([{ data: "hello" }]);
  });

  it("parses multiple events in one chunk", () => {
    const parser = new SSEParser();
    const events = parser.feed("data: one\n\ndata: two\n\n");
    expect(events).toEqual([{ data: "one" }, { data: "two" }]);
  });

  it("skips comment lines (keepalive)", () => {
    const parser = new SSEParser();
    const events = parser.feed(":\n\ndata: real\n\n");
    expect(events).toEqual([{ data: "real" }]);
  });

  it("handles named events", () => {
    const parser = new SSEParser();
    const events = parser.feed("event: hash\ndata: abc123\n\n");
    expect(events).toEqual([{ type: "hash", data: "abc123" }]);
  });

  it("handles multi-line data", () => {
    const parser = new SSEParser();
    const events = parser.feed("data: line1\ndata: line2\n\n");
    expect(events).toEqual([{ data: "line1\nline2" }]);
  });

  it("buffers incomplete events across multiple feeds", () => {
    const parser = new SSEParser();
    expect(parser.feed("data: hel")).toEqual([]);
    expect(parser.feed("lo\n\n")).toEqual([{ data: "hello" }]);
  });

  it("buffers keepalive split across feeds", () => {
    const parser = new SSEParser();
    expect(parser.feed(":\n")).toEqual([]);
    expect(parser.feed("\ndata: ok\n\n")).toEqual([{ data: "ok" }]);
  });

  it("handles data starting with colon", () => {
    const parser = new SSEParser();
    const events = parser.feed("data: : {\n\n");
    expect(events).toEqual([{ data: ": {" }]);
  });

  it("handles interleaved keepalives and data", () => {
    const parser = new SSEParser();
    const events = parser.feed("data: a\n\n:\n\ndata: b\n\n:\n\n");
    expect(events).toEqual([{ data: "a" }, { data: "b" }]);
  });

  it("handles realistic LLM streaming with chunked delivery", () => {
    const parser = new SSEParser();
    const allEvents: { type?: string; data: string }[] = [];

    // Network chunks don't align with SSE event boundaries
    allEvents.push(...parser.feed("event: hash\ndata: abc12"));
    allEvents.push(...parser.feed("3\n\ndata: {\"me\n\n"));
    allEvents.push(...parser.feed(":\n\ndata: ta\":\n\n"));
    allEvents.push(...parser.feed("data: {\"producteur\"}\n\n"));

    expect(allEvents).toEqual([
      { type: "hash", data: "abc123" },
      { data: '{"me' },
      { data: 'ta":' },
      { data: '{"producteur"}' },
    ]);
  });
});
