import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeWatchStatus, normalizeMediaType, incrementRewatch } from './db';

describe('Database utilities', () => {
  it('should normalize watch status properly', () => {
    expect(normalizeWatchStatus('Plan to Watch')).toBe('Plan to Watch');
    expect(normalizeWatchStatus('Watching')).toBe('Watching');
    expect(normalizeWatchStatus('Completed')).toBe('Completed');
    expect(normalizeWatchStatus('InvalidStatus')).toBe('Plan to Watch');
  });

  it('should normalize media types properly', () => {
    expect(normalizeMediaType('Movie')).toBe('Movie');
    expect(normalizeMediaType('TV Show')).toBe('TV Show');
    expect(normalizeMediaType('Anime')).toBe('Anime');
    expect(normalizeMediaType('InvalidType')).toBe('Movie');
  });

  it('should safely fallback for any random string input', () => {
    fc.assert(
      fc.property(fc.string(), (randomStr) => {
        const status = normalizeWatchStatus(randomStr as Parameters<typeof normalizeWatchStatus>[0]);
        const type = normalizeMediaType(randomStr as Parameters<typeof normalizeMediaType>[0]);

        expect(['Plan to Watch', 'Watching', 'Completed']).toContain(status);
        expect(['Movie', 'TV Show', 'Anime']).toContain(type);
      })
    );
  });

  it('should increment rewatch count and append the timestamp', () => {
    const first = incrementRewatch({}, 1000);
    expect(first).toEqual({ rewatchCount: 1, rewatchDates: [1000] });

    const second = incrementRewatch(first, 2000);
    expect(second).toEqual({ rewatchCount: 2, rewatchDates: [1000, 2000] });
  });

  it('should never mutate the entry passed to incrementRewatch', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.integer(), (dates, ts) => {
        const entry = { rewatchCount: dates.length, rewatchDates: [...dates] };
        const before = JSON.stringify(entry);
        incrementRewatch(entry, ts);
        expect(JSON.stringify(entry)).toBe(before);
      })
    );
  });
});
