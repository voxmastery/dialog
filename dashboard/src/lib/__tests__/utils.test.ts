import { describe, it, expect } from 'vitest';
import { cn, formatTimestamp, formatDuration, timeAgo, truncate } from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });
  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => { expect(formatDuration(45)).toBe('45ms'); });
  it('formats seconds', () => { expect(formatDuration(1500)).toBe('1.5s'); });
  it('handles null', () => { expect(formatDuration(null)).toBe('-'); });
});

describe('truncate', () => {
  it('truncates long strings', () => { expect(truncate('hello world', 8)).toBe('hello...'); });
  it('keeps short strings', () => { expect(truncate('hi', 10)).toBe('hi'); });
});

describe('timeAgo', () => {
  it('shows just now for recent timestamps', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });
});
