import {describe, expect, it} from 'vitest';

import {listDesignSettings, updateDesignSettings} from './design-setting-tools';
import {withThemeRevision} from './theme-state';

import type {ThemeDraft} from './theme-state';

async function drafts(): Promise<{baseline: ThemeDraft; draft: ThemeDraft}> {
    const baseline = await withThemeRevision({
        revision: '',
        theme: {name: 'demo', version: '1.0.0', builtIn: false, rootPrefix: ''},
        files: {'index.hbs': {path: 'index.hbs', kind: 'text', content: '<main />', binary: null, unixPermissions: null, dosPermissions: null}},
        globalSettings: {accent_color: '#15171A', heading_font: 'Inter', body_font: 'Georgia', icon: '/icon.png', logo: '/logo.png', cover_image: '/cover.jpg'},
        customSettings: {
            title: {id: 'title', key: 'title', type: 'text', value: 'Hello', default: null},
            featured: {id: 'featured', key: 'featured', type: 'boolean', value: true, default: false},
            layout: {id: 'layout', key: 'layout', type: 'select', value: 'Grid', default: 'List', options: ['List', 'Grid']},
            brand: {id: 'brand', key: 'brand', type: 'color', value: '#FF0000', default: '#000000'},
            hero: {id: 'hero', key: 'hero', type: 'image', value: '/hero.jpg'},
            secret: {id: 'secret', key: 'secret', type: 'text', value: 'hidden', default: null, visibility: 'featured:false'}
        },
        renderer: {siteUrl: 'https://example.com/', contentApiKey: 'key', config: {}, missing: []},
        virtualUrl: 'https://example.com/',
        selection: null
    });
    const staged = structuredClone(baseline);
    staged.globalSettings.accent_color = '#123456';
    staged.customSettings.title.value = 'Staged';
    return {baseline, draft: await withThemeRevision(staged)};
}

describe('design setting tools', () => {
    it('lists global and visible custom settings with current and staged values', async () => {
        const {baseline, draft} = await drafts();
        const result = listDesignSettings(draft, baseline);

        expect(result).toMatchObject({ok: true, revision: draft.revision});
        if (!result.ok) {
            throw new Error('Expected settings to list');
        }
        expect(result.data.settings).toEqual(expect.arrayContaining([
            expect.objectContaining({identifier: 'global.accent_color', type: 'color', currentValue: '#15171A', stagedValue: '#123456', writable: true}),
            expect.objectContaining({identifier: 'global.heading_font', type: 'text', currentValue: 'Inter', stagedValue: 'Inter', writable: true}),
            expect.objectContaining({identifier: 'global.body_font', type: 'text', currentValue: 'Georgia', stagedValue: 'Georgia', writable: true}),
            expect.objectContaining({identifier: 'global.icon', type: 'image', writable: false}),
            expect.objectContaining({identifier: 'theme.title', type: 'text', currentValue: 'Hello', stagedValue: 'Staged', writable: true}),
            expect.objectContaining({identifier: 'theme.featured', type: 'boolean', writable: true}),
            expect.objectContaining({identifier: 'theme.layout', type: 'select', choices: ['List', 'Grid'], writable: true}),
            expect.objectContaining({identifier: 'theme.brand', type: 'color', writable: true}),
            expect.objectContaining({identifier: 'theme.hero', type: 'image', writable: false})
        ]));
        expect(result.data.settings.some(setting => setting.identifier === 'theme.secret')).toBe(false);
    });

    it('stages multiple valid global and custom setting updates in one revision', async () => {
        const {draft} = await drafts();
        const result = await updateDesignSettings(draft, {
            revision: draft.revision,
            values: {
                'global.accent_color': '#AABBCC',
                'global.heading_font': 'Modern sans-serif',
                'theme.title': 'Updated',
                'theme.featured': false,
                'theme.layout': 'List',
                'theme.brand': '#ABCDEF'
            }
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error('Expected settings update to succeed');
        }
        expect(result.data.updated).toEqual([
            'global.accent_color',
            'global.heading_font',
            'theme.title',
            'theme.featured',
            'theme.layout',
            'theme.brand'
        ]);
        expect(result.candidate.globalSettings.accent_color).toBe('#AABBCC');
        expect(result.candidate.customSettings.layout.value).toBe('List');
        expect(result.candidate.revision).not.toBe(draft.revision);
        expect(draft.customSettings.layout.value).toBe('Grid');
    });

    it.each([
        {identifier: 'global.accent_color', value: 'red', code: 'invalid_color'},
        {identifier: 'theme.brand', value: '#12', code: 'invalid_color'},
        {identifier: 'theme.layout', value: 'Cards', code: 'invalid_option'},
        {identifier: 'theme.featured', value: 'false', code: 'invalid_setting_value'},
        {identifier: 'theme.secret', value: 'shown', code: 'setting_hidden'},
        {identifier: 'theme.hero', value: '/new.jpg', code: 'setting_read_only'},
        {identifier: 'global.logo', value: '/new.png', code: 'setting_read_only'},
        {identifier: 'theme.missing', value: 'x', code: 'setting_not_found'},
        {identifier: 'theme.__proto__', value: 'polluted', code: 'setting_not_found'}
    ])('rejects $code for $identifier', async ({identifier, value, code}) => {
        const {draft} = await drafts();
        const result = await updateDesignSettings(draft, {revision: draft.revision, values: {[identifier]: value}});

        expect(result).toMatchObject({ok: false, revision: draft.revision, error: {code}});
    });

    it('rejects stale revisions without changing the draft', async () => {
        const {draft} = await drafts();
        const result = await updateDesignSettings(draft, {revision: 'theme-stale', values: {'theme.title': 'Lost'}});

        expect(result).toMatchObject({ok: false, revision: draft.revision, error: {code: 'stale_revision'}});
        expect(draft.customSettings.title.value).toBe('Staged');
    });
});
