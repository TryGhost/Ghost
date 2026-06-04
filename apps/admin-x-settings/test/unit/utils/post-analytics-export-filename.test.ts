import {afterEach, describe, expect, it, vi} from 'vitest';
import {getPostAnalyticsExportFileName} from '@src/components/settings/advanced/migration-tools/migration-tools-export';

describe('getPostAnalyticsExportFileName', function () {
    afterEach(function () {
        vi.useRealTimers();
    });

    it('includes the slugified site title', function () {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

        expect(getPostAnalyticsExportFileName('My Publication')).toBe('my-publication.ghost.analytics.2026-06-02.csv');
    });

    it('falls back to ghost when the site title is missing', function () {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

        expect(getPostAnalyticsExportFileName(null)).toBe('ghost.analytics.2026-06-02.csv');
    });
});
