import {describe, expect, it} from 'vitest';
import {filmstripTimes, formatTime} from '../../../src/utils/videoFrames';

describe('formatTime', () => {
    it('reads as the video card shows a time', () => {
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(4.6)).toBe('0:04');
        expect(formatTime(72)).toBe('1:12');
        expect(formatTime(3600)).toBe('60:00');
    });
});

describe('filmstripTimes', () => {
    it('spreads frames across the video, each from the middle of its slice', () => {
        expect(filmstripTimes(8, 4)).toEqual([1, 3, 5, 7]);
    });

    it('stays inside a short video, never on its last instant', () => {
        const times = filmstripTimes(1, 8);
        expect(times).toHaveLength(8);
        expect(Math.min(...times)).toBeGreaterThan(0);
        expect(Math.max(...times)).toBeLessThan(1);
    });
});
