import { describe, it, expect } from 'vitest';
import { fuzzySearch, highlightMatches } from './fuzzy-search';

interface TestItem {
  name: string;
  tags?: string[];
}

const fields = {
  name: (item: TestItem) => item.name,
};

const fieldsWithTags = {
  name: (item: TestItem) => item.name,
  tags: (item: TestItem) => item.tags || [],
};

describe('fuzzySearch', () => {
  it('returns all items with score 100 when query is empty', () => {
    const items = [{ name: 'alpha' }, { name: 'beta' }];
    const result = fuzzySearch(items, '', fields);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(100);
    expect(result[1].score).toBe(100);
  });

  it('scores exact match at 100', () => {
    const items = [{ name: 'test' }];
    const result = fuzzySearch(items, 'test', fields);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  it('scores starts-with at 80', () => {
    const items = [{ name: 'testing' }];
    const result = fuzzySearch(items, 'test', fields);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it('scores contains at 60', () => {
    const items = [{ name: 'my testing file' }];
    const result = fuzzySearch(items, 'testing', fields);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(60);
  });

  it('scores sequential character match at 40+', () => {
    const items = [{ name: 'abcxyzdef' }];
    const result = fuzzySearch(items, 'acd', fields);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(40);
    expect(result[0].score).toBeLessThan(60);
  });

  it('sorts results by score descending', () => {
    const items = [
      { name: 'some test' },   // contains → 60
      { name: 'test' },         // exact → 100
      { name: 'testing' },      // starts-with → 80
    ];
    const result = fuzzySearch(items, 'test', fields);
    expect(result[0].item.name).toBe('test');
    expect(result[1].item.name).toBe('testing');
    expect(result[2].item.name).toBe('some test');
  });

  it('filters by minScore', () => {
    const items = [
      { name: 'test' },       // exact → 100
      { name: 'abcdefg' },    // no match → 0
    ];
    const result = fuzzySearch(items, 'test', fields, 50);
    expect(result).toHaveLength(1);
    expect(result[0].item.name).toBe('test');
  });

  it('searches array fields', () => {
    const items: TestItem[] = [{ name: 'item1', tags: ['build', 'deploy'] }];
    const result = fuzzySearch(items, 'deploy', fieldsWithTags);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  it('returns empty for no matches above minScore', () => {
    const items = [{ name: 'xyz' }];
    const result = fuzzySearch(items, 'abc', fields, 50);
    expect(result).toHaveLength(0);
  });

  it('is case insensitive', () => {
    const items = [{ name: 'Test' }];
    const result = fuzzySearch(items, 'test', fields);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  it('trims whitespace from query', () => {
    const items = [{ name: 'test' }];
    const result = fuzzySearch(items, '  test  ', fields);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });
});

describe('highlightMatches', () => {
  it('highlights matched characters', () => {
    const result = highlightMatches('test', [0, 2]);
    expect(result).toBe('<mark>t</mark>e<mark>s</mark>t');
  });

  it('returns original text with no indices', () => {
    const result = highlightMatches('test', []);
    expect(result).toBe('test');
  });

  it('handles all characters matched', () => {
    const result = highlightMatches('ab', [0, 1]);
    expect(result).toBe('<mark>a</mark><mark>b</mark>');
  });
});
