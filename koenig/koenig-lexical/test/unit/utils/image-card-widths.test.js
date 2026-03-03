import {describe, expect, it} from 'vitest';
import {getAllowedImageCardWidths, getDefaultImageCardWidth} from '../../../src/utils/image-card-widths';

describe('image-card-widths utils', () => {
    it('returns all widths when config is missing', () => {
        expect(getAllowedImageCardWidths()).toEqual(['regular', 'wide', 'full']);
    });

    it('returns all widths when config is invalid or empty', () => {
        expect(getAllowedImageCardWidths('regular')).toEqual(['regular', 'wide', 'full']);
        expect(getAllowedImageCardWidths([])).toEqual(['regular', 'wide', 'full']);
        expect(getAllowedImageCardWidths(['invalid'])).toEqual(['regular', 'wide', 'full']);
    });

    it('filters invalid values and de-duplicates while preserving order', () => {
        expect(getAllowedImageCardWidths(['wide', 'invalid', 'full', 'wide'])).toEqual(['wide', 'full']);
    });

    it('defaults to regular width when available', () => {
        expect(getDefaultImageCardWidth(['regular', 'wide'])).toBe('regular');
    });

    it('defaults to first allowed width when regular is not available', () => {
        expect(getDefaultImageCardWidth(['wide', 'full'])).toBe('wide');
    });
});
