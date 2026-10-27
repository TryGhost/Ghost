import {describe, expect, it} from 'vitest';
import {isGif} from '../../../src/utils/isGif';

describe('isGif', () => {
    it('recognizes GIF URLs with queries or fragments, regardless of extension case', () => {
        for (const url of [
            '/animation.gif',
            '/animation.gif?v=1',
            '/animation.gif#preview',
            '/animation.GIF?v=1#preview',
        ]) {
            expect(isGif(url)).toBe(true);
        }
    });

    it('does not classify a non-GIF path from its query string', () => {
        expect(isGif('/animation.png?format=.gif')).toBe(false);
        expect(isGif('/animation.gifx')).toBe(false);
        expect(isGif(undefined)).toBe(false);
    });
});
