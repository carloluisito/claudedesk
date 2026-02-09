export interface ParsedMessage {
  id: string;
  timestamp: number;
  sender: string;
  receiver?: string;
  content: string;
  sessionId: string;
  raw: string;
}

// Message patterns from Claude Code's agent team communication
const PATTERNS = [
  // [AgentName → TargetName]: message
  /\[(\w[\w\s]*?)\s*→\s*(\w[\w\s]*?)\]:\s*(.+)/,
  // Sending message to AgentName: message
  /Sending message to (\w[\w\s]*?):\s*(.+)/,
  // Message from AgentName: message
  /Message from (\w[\w\s]*?):\s*(.+)/,
  // → AgentName: message
  /→\s*(\w[\w\s]*?):\s*(.+)/,
];

const seenHashes = new Set<string>();
let messageCounter = 0;

function hashContent(content: string): string {
  // Simple hash for dedup
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return String(hash);
}

export function parseMessages(text: string, sessionId: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const pattern of PATTERNS) {
      const match = trimmed.match(pattern);
      if (!match) continue;

      let sender: string;
      let receiver: string | undefined;
      let content: string;

      if (match.length === 4) {
        // Pattern with sender → receiver
        sender = match[1].trim();
        receiver = match[2].trim();
        content = match[3].trim();
      } else if (match.length === 3) {
        sender = match[1].trim();
        content = match[2].trim();
      } else {
        continue;
      }

      // Deduplicate
      const dedupKey = hashContent(`${sender}:${receiver || ''}:${content}`);
      if (seenHashes.has(dedupKey)) continue;
      seenHashes.add(dedupKey);

      // Keep hash set bounded
      if (seenHashes.size > 5000) {
        const arr = Array.from(seenHashes);
        for (let i = 0; i < 1000; i++) {
          seenHashes.delete(arr[i]);
        }
      }

      messages.push({
        id: `msg-${++messageCounter}`,
        timestamp: Date.now(),
        sender,
        receiver,
        content,
        sessionId,
        raw: trimmed,
      });

      break; // Only match first pattern per line
    }
  }

  return messages;
}

export function resetParser(): void {
  seenHashes.clear();
  messageCounter = 0;
}
