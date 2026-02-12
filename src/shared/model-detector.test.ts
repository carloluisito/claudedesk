import { describe, it, expect } from 'vitest';
import { detectModelFromOutput } from './model-detector';

describe('detectModelFromOutput', () => {
  describe('initial detection (welcome screen)', () => {
    it('detects "Haiku 4.5 ·" format', () => {
      const result = detectModelFromOutput('Haiku 4.5 · Claude Max', true);
      expect(result).toEqual({ model: 'haiku', confidence: 'high' });
    });

    it('detects "Opus 4.6 ·" format', () => {
      const result = detectModelFromOutput('Opus 4.6 · Claude Max', true);
      expect(result).toEqual({ model: 'opus', confidence: 'high' });
    });

    it('detects "Sonnet 4.5 ·" format', () => {
      const result = detectModelFromOutput('Sonnet 4.5 · Claude Max', true);
      expect(result).toEqual({ model: 'sonnet', confidence: 'high' });
    });

    it('detects "Claude 3.5 Sonnet" format', () => {
      const result = detectModelFromOutput('Welcome to Claude 3.5 Sonnet', true);
      expect(result).toEqual({ model: 'sonnet', confidence: 'high' });
    });

    it('detects "(Opus 4.6 · Most capable" format', () => {
      const result = detectModelFromOutput('(Opus 4.6 · Most capable model)', true);
      expect(result).toEqual({ model: 'opus', confidence: 'high' });
    });

    it('rejects promo text without ·', () => {
      // "Opus 4.6 is here" should NOT match the first pattern
      // because "is here" appears before "·"
      const result = detectModelFromOutput('Opus 4.6 is here · $50 free', true);
      // This should still match via the second pattern (Claude ... Opus)
      // or not match the first pattern. The key is it doesn't falsely detect.
      // Actually the first pattern requires · immediately after version, "is here" breaks it.
      expect(result.model).toBeNull();
    });

    it('returns null for unrecognized text', () => {
      const result = detectModelFromOutput('Welcome to the chat', true);
      expect(result).toEqual({ model: null, confidence: 'low' });
    });

    it('strips ANSI codes before matching', () => {
      const ansi = '\x1b[1m\x1b[34mHaiku 4.5 · Claude Max\x1b[0m';
      const result = detectModelFromOutput(ansi, true);
      expect(result).toEqual({ model: 'haiku', confidence: 'high' });
    });
  });

  describe('switch detection', () => {
    it('detects "Set model to Opus"', () => {
      const result = detectModelFromOutput('Set model to Opus (claude-opus-4-6)', false);
      expect(result).toEqual({ model: 'opus', confidence: 'high' });
    });

    it('detects "Set model to Default (Opus 4.6..."', () => {
      const result = detectModelFromOutput('Set model to Default (Opus 4.6 · Most capable)', false);
      expect(result).toEqual({ model: 'opus', confidence: 'high' });
    });

    it('detects "Kept model as Sonnet"', () => {
      const result = detectModelFromOutput('Kept model as Sonnet', false);
      expect(result).toEqual({ model: 'sonnet', confidence: 'high' });
    });

    it('detects "Kept model as Default (Haiku"', () => {
      const result = detectModelFromOutput('Kept model as Default (Haiku 4.5)', false);
      expect(result).toEqual({ model: 'haiku', confidence: 'high' });
    });

    it('detects "Model changed to haiku"', () => {
      const result = detectModelFromOutput('Model changed to haiku', false);
      expect(result).toEqual({ model: 'haiku', confidence: 'high' });
    });

    it('returns null for unrelated text', () => {
      const result = detectModelFromOutput('This is just some output text', false);
      expect(result).toEqual({ model: null, confidence: 'low' });
    });

    it('strips ANSI before switch detection', () => {
      const ansi = '\x1b[32mSet model to Opus\x1b[0m';
      const result = detectModelFromOutput(ansi, false);
      expect(result).toEqual({ model: 'opus', confidence: 'high' });
    });
  });
});
