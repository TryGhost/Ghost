import {describe, expect, it} from 'vitest';
import {formatWait} from '@src/views/Automations/components/automation-canvas';

describe('formatWait', () => {
    it('throws for 0 or negative hours', () => {
        expect(() => formatWait(0)).toThrow();
        expect(() => formatWait(-1)).toThrow();
    });

    it('formats sub-day waits in hours with correct pluralization', () => {
        expect(formatWait(1)).toBe('1 hour');
        expect(formatWait(2)).toBe('2 hours');
        expect(formatWait(23)).toBe('23 hours');
    });

    it('formats whole-day waits as days', () => {
        expect(formatWait(24)).toBe('1 day');
        expect(formatWait(48)).toBe('2 days');
        expect(formatWait(168)).toBe('7 days');
    });

    it('falls back to hours when not a whole-day multiple', () => {
        expect(formatWait(25)).toBe('25 hours');
        expect(formatWait(49)).toBe('49 hours');
    });
});
