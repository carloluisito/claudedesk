import { describe, it, expect, beforeEach } from 'vitest';
import { parseMessages, resetParser } from './message-parser';

describe('parseMessages', () => {
  beforeEach(() => {
    resetParser();
  });

  it('parses "@agent> message" format', () => {
    const result = parseMessages('@frontend> Starting the build', 'sess-1');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('frontend');
    expect(result[0].content).toBe('Starting the build');
    expect(result[0].sessionId).toBe('sess-1');
  });

  it('parses "@agent → @target: message" format', () => {
    const result = parseMessages('@lead → @worker: Do the task', 'sess-1');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('lead');
    expect(result[0].receiver).toBe('worker');
    expect(result[0].content).toBe('Do the task');
  });

  it('parses "[Agent → Target]: message" format', () => {
    const result = parseMessages('[Lead Agent → Worker]: Start deployment', 'sess-1');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Lead Agent');
    expect(result[0].receiver).toBe('Worker');
    expect(result[0].content).toBe('Start deployment');
  });

  it('parses "Sending message to Agent: message" format', () => {
    const result = parseMessages('Sending message to Backend: Update the API', 'sess-1');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('lead');
    expect(result[0].receiver).toBe('Backend');
    expect(result[0].content).toBe('Update the API');
  });

  it('strips ANSI codes before parsing', () => {
    const ansi = '\x1b[32m@frontend> Building\x1b[0m';
    const result = parseMessages(ansi, 'sess-1');
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('frontend');
    expect(result[0].content).toBe('Building');
  });

  it('deduplicates identical messages', () => {
    const text = '@agent> Hello\n@agent> Hello';
    const result = parseMessages(text, 'sess-1');
    expect(result).toHaveLength(1);
  });

  it('skips empty lines', () => {
    const result = parseMessages('\n\n\n', 'sess-1');
    expect(result).toHaveLength(0);
  });

  it('returns empty array for non-matching text', () => {
    const result = parseMessages('This is normal output', 'sess-1');
    expect(result).toHaveLength(0);
  });

  it('handles multiple different messages', () => {
    const text = '@frontend> Building\n@backend> Ready';
    const result = parseMessages(text, 'sess-1');
    expect(result).toHaveLength(2);
    expect(result[0].sender).toBe('frontend');
    expect(result[1].sender).toBe('backend');
  });

  it('assigns incremental IDs', () => {
    const result = parseMessages('@a> Hello\n@b> World', 'sess-1');
    expect(result[0].id).toMatch(/^msg-\d+$/);
    expect(result[1].id).toMatch(/^msg-\d+$/);
    expect(result[0].id).not.toBe(result[1].id);
  });
});
