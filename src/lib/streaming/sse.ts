/**
 * SSE (Server-Sent Events) encoding and parsing.
 *
 * Server: encode LLM deltas as `data:` events, keepalives as `:` comments.
 * Client: parse SSE events from a fetch ReadableStream (EventSource doesn't support POST).
 */

const encoder = new TextEncoder();

// --- Server-side encoding ---

export function sseData(text: string): Uint8Array {
  const lines = text.split("\n");
  return encoder.encode(lines.map((l) => `data: ${l}`).join("\n") + "\n\n");
}

export function sseEvent(event: string, data: string): Uint8Array {
  const lines = data.split("\n");
  return encoder.encode(
    `event: ${event}\n${lines.map((l) => `data: ${l}`).join("\n")}\n\n`,
  );
}

const SSE_KEEPALIVE = encoder.encode(":\n\n");
export function sseComment(): Uint8Array {
  return SSE_KEEPALIVE;
}

// --- Client-side parsing ---

export interface SSEEvent {
  type?: string;
  data: string;
}

export class SSEParser {
  private buffer = "";

  feed(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    let idx;
    while ((idx = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);

      let eventType: string | undefined;
      const dataLines: string[] = [];

      for (const line of block.split("\n")) {
        if (line.startsWith(":")) continue;
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          dataLines.push(line.slice(6));
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5));
        }
      }

      if (dataLines.length > 0) {
        events.push({ type: eventType, data: dataLines.join("\n") });
      }
    }

    return events;
  }
}
