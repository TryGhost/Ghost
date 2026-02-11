import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

describe('Loader', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getConfig', () => {
        it('should parse data attributes from script tag', async () => {
            const mockScript = document.createElement('script');
            mockScript.dataset.ghost = 'https://example.com';
            mockScript.dataset.key = 'abc123';
            mockScript.dataset.features = 'announcement,portal';
            mockScript.dataset.locale = 'de';

            vi.stubGlobal('document', {
                ...document,
                currentScript: mockScript,
                readyState: 'complete'
            });

            const {getConfig} = await import('../src/loader');
            const config = getConfig();

            expect(config.ghost).toBe('https://example.com');
            expect(config.key).toBe('abc123');
            expect(config.features).toEqual(['announcement', 'portal']);
            expect(config.locale).toBe('de');
        });

        it('should filter empty feature strings', async () => {
            const mockScript = document.createElement('script');
            mockScript.dataset.features = 'announcement,,portal,';

            vi.stubGlobal('document', {
                ...document,
                currentScript: mockScript,
                readyState: 'complete'
            });

            const {getConfig} = await import('../src/loader');
            const config = getConfig();

            expect(config.features).toEqual(['announcement', 'portal']);
        });
    });

    describe('loadFeature', () => {
        it('should warn on unknown features', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const mockScript = document.createElement('script');
            mockScript.dataset.ghost = 'https://example.com';
            mockScript.dataset.features = '';

            vi.stubGlobal('document', {
                ...document,
                currentScript: mockScript,
                readyState: 'complete'
            });

            const {loadFeature, getConfig} = await import('../src/loader');
            const config = getConfig();

            await loadFeature('unknown-feature', config);

            expect(warnSpy).toHaveBeenCalledWith('[public-apps] Unknown feature: unknown-feature');
        });
    });
});
