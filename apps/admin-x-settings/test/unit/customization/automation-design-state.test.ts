import * as assert from 'assert/strict';
import {readAutomationDesignState, writeAutomationDesignState} from '@src/components/settings/email/customization/stores/automation-design-state';
import {vi} from 'vitest';

describe('automationDesignStateStore', function () {
    beforeEach(function () {
        localStorage.clear();
    });

    it('reads empty state when storage is empty', function () {
        assert.deepEqual(readAutomationDesignState(), {});
    });

    it('writes and reads background color state', function () {
        writeAutomationDesignState({
            background_color: '#123456',
            header_background_color: '#abcdef',
            header_image: 'https://ghost.test/content/images/header.png',
            show_header_title: true,
            footer_content: '<p>Footer text</p>',
            title_font_category: 'serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            section_title_color: 'accent',
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: '#654321',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: 'light'
        });

        assert.deepEqual(readAutomationDesignState(), {
            background_color: '#123456',
            header_background_color: '#abcdef',
            header_image: 'https://ghost.test/content/images/header.png',
            show_header_title: true,
            footer_content: '<p>Footer text</p>',
            title_font_category: 'serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            section_title_color: 'accent',
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: '#654321',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: 'light'
        });
    });

    it('returns empty state for invalid json', function () {
        localStorage.setItem('ghost-admin-x-settings-automation-design-state-v1', '{invalid json');

        assert.deepEqual(readAutomationDesignState(), {});
    });

    it('ignores legacy newsletter-only keys when reading state', function () {
        localStorage.setItem('ghost-admin-x-settings-automation-design-state-v1', JSON.stringify({
            background_color: '#123456',
            post_title_color: '#abcdef',
            title_alignment: 'left'
        }));

        assert.deepEqual(readAutomationDesignState(), {
            background_color: '#123456'
        });
    });

    it('ignores localStorage access errors', function () {
        const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('getItem failed');
        });
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('setItem failed');
        });

        assert.deepEqual(readAutomationDesignState(), {});
        assert.doesNotThrow(() => writeAutomationDesignState({
            background_color: '#abcdef',
            header_background_color: '#123456',
            header_image: 'https://ghost.test/content/images/header.png',
            show_header_title: false,
            footer_content: '',
            title_font_category: 'sans_serif',
            title_font_weight: 'medium',
            body_font_category: 'serif',
            section_title_color: '#112233',
            button_color: null,
            button_style: 'outline',
            button_corners: 'pill',
            link_color: 'accent',
            link_style: 'bold',
            image_corners: 'rounded',
            divider_color: 'accent'
        }));

        getItemSpy.mockRestore();
        setItemSpy.mockRestore();
    });
});
