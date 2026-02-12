import { describe, it, expect } from 'vitest';
import { resolveVariables, extractVariables, getMissingVariables } from './variable-resolver';

describe('resolveVariables', () => {
  it('replaces {clipboard} when provided', () => {
    const result = resolveVariables('Paste: {clipboard}', { clipboard: 'hello' });
    expect(result).toBe('Paste: hello');
  });

  it('replaces {current_dir}', () => {
    const result = resolveVariables('Dir: {current_dir}', { currentDir: '/home/user' });
    expect(result).toBe('Dir: /home/user');
  });

  it('replaces {selection}', () => {
    const result = resolveVariables('Selected: {selection}', { selection: 'some code' });
    expect(result).toBe('Selected: some code');
  });

  it('replaces {session_name}', () => {
    const result = resolveVariables('Session: {session_name}', { sessionName: 'my-session' });
    expect(result).toBe('Session: my-session');
  });

  it('replaces {datetime} with ISO-like format', () => {
    const result = resolveVariables('Time: {datetime}', {});
    // Should be YYYY-MM-DD HH:MM:SS format
    expect(result).toMatch(/Time: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it('replaces {date} with ISO date format', () => {
    const result = resolveVariables('Date: {date}', {});
    expect(result).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
  });

  it('replaces multiple variables in one string', () => {
    const result = resolveVariables('{clipboard} in {current_dir}', {
      clipboard: 'code',
      currentDir: '/src',
    });
    expect(result).toBe('code in /src');
  });

  it('replaces multiple occurrences of same variable', () => {
    const result = resolveVariables('{clipboard} and {clipboard}', { clipboard: 'X' });
    expect(result).toBe('X and X');
  });

  it('leaves unreplaced variables in place when not in context', () => {
    const result = resolveVariables('Value: {clipboard}', {});
    expect(result).toBe('Value: {clipboard}');
  });

  it('handles empty prompt', () => {
    const result = resolveVariables('', {});
    expect(result).toBe('');
  });
});

describe('extractVariables', () => {
  it('extracts variables from template', () => {
    const result = extractVariables('Hello {clipboard} in {current_dir}');
    expect(result).toEqual(['clipboard', 'current_dir']);
  });

  it('deduplicates variables', () => {
    const result = extractVariables('{clipboard} and {clipboard}');
    expect(result).toEqual(['clipboard']);
  });

  it('returns empty array when no variables', () => {
    const result = extractVariables('No variables here');
    expect(result).toEqual([]);
  });

  it('handles empty string', () => {
    const result = extractVariables('');
    expect(result).toEqual([]);
  });
});

describe('getMissingVariables', () => {
  it('returns missing clipboard when not in context', () => {
    const result = getMissingVariables('Paste: {clipboard}', {});
    expect(result).toEqual(['clipboard']);
  });

  it('skips datetime and date (always available)', () => {
    const result = getMissingVariables('{datetime} {date}', {});
    expect(result).toEqual([]);
  });

  it('returns empty when all variables provided', () => {
    const result = getMissingVariables('{clipboard}', { clipboard: 'text' });
    expect(result).toEqual([]);
  });

  it('returns multiple missing variables', () => {
    const result = getMissingVariables('{clipboard} {selection}', {});
    expect(result).toEqual(['clipboard', 'selection']);
  });
});
