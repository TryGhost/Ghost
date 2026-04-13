import assert from 'node:assert/strict';
import {DEFAULT_EMAIL_DESIGN} from '@src/components/settings/email-design/types';
import {buildAutomatedEmailDesignPayload, mapApiToDesignSettings} from '@src/components/settings/membership/member-emails/welcome-email-customize-modal';

describe('Welcome email design payload helpers', function () {
    it('does not hydrate immutable api metadata into design settings', function () {
        const apiData = {
            id: '1',
            slug: 'default-automated-email',
            created_at: '2026-04-02T00:00:00.000Z',
            updated_at: '2026-04-02T00:00:00.000Z',
            header_image: null,
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            footer_content: null,
            ...DEFAULT_EMAIL_DESIGN
        };

        const result = mapApiToDesignSettings(apiData as never) as unknown as typeof apiData;

        assert.equal('id' in result, false);
        assert.equal('slug' in result, false);
        assert.equal('created_at' in result, false);
        assert.equal('updated_at' in result, false);
        assert.equal('header_image' in result, false);
        assert.equal('show_header_icon' in result, false);
        assert.equal('show_header_title' in result, false);
        assert.equal('show_badge' in result, false);
        assert.equal('footer_content' in result, false);
    });

    it('preserves unexpected persisted design fields when mapping api data', function () {
        const apiData = {
            ...DEFAULT_EMAIL_DESIGN,
            post_title_color: undefined,
            title_alignment: undefined,
            custom_future_field: '#123456'
        };

        const result = mapApiToDesignSettings(apiData as never) as unknown as typeof apiData;

        assert.equal(result.custom_future_field, '#123456');
    });

    it('preserves unexpected persisted design fields in the save payload while excluding preview-only fields', function () {
        const state = {
            designSettings: {
                ...DEFAULT_EMAIL_DESIGN,
                id: '1',
                slug: 'default-automated-email',
                created_at: '2026-04-02T00:00:00.000Z',
                updated_at: '2026-04-02T00:00:00.000Z',
                custom_future_field: '#abcdef'
            } as unknown as typeof DEFAULT_EMAIL_DESIGN & {
                id: string;
                slug: string;
                created_at: string;
                updated_at: string;
                custom_future_field: string;
            },
            generalSettings: {
                senderName: 'Ghost',
                senderEmail: 'hello@example.com',
                replyToEmail: 'support@example.com',
                headerImage: '',
                showPublicationIcon: true,
                showPublicationTitle: true,
                showBadge: false,
                emailFooter: ''
            }
        };

        const payload = buildAutomatedEmailDesignPayload(state as never) as typeof state.designSettings & {
            header_image: string | null;
            show_header_icon: boolean;
            show_header_title: boolean;
            show_badge: boolean;
            footer_content: string | null;
        };

        assert.equal(payload.custom_future_field, '#abcdef');
        assert.equal('id' in payload, false);
        assert.equal('slug' in payload, false);
        assert.equal('created_at' in payload, false);
        assert.equal('updated_at' in payload, false);
        assert.equal('post_title_color' in payload, false);
        assert.equal('title_alignment' in payload, false);
        assert.equal(payload.show_header_icon, true);
    });
});
