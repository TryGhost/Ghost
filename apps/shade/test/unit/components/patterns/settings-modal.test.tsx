import {describe, expect, it} from 'vitest';

import {settingsModalVariants, type SettingsModalSize} from '@/components/patterns/settings-modal';

describe('SettingsModal', () => {
    it.each<SettingsModalSize>(['sm', 'md', 'lg', 'xl', 'full'])('uses the standard dialog radius for the %s size', (size) => {
        expect(settingsModalVariants({size})).toContain('rounded-lg');
    });

    it('keeps the edge-to-edge bleed size square', () => {
        const size: SettingsModalSize = 'bleed';

        expect(settingsModalVariants({size})).not.toContain('rounded-lg');
    });
});
