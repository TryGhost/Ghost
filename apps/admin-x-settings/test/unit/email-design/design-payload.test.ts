import * as assert from 'assert/strict';
import {DEFAULT_EMAIL_DESIGN} from '@src/components/settings/email-design/types';
import {buildAutomatedEmailDesignPayload, mapApiToDesignSettings} from '@src/components/settings/membership/member-emails/welcome-email-customize-modal';

describe('Welcome email design payload helpers', function () {
    it('preserves unexpected persisted design fields when mapping api data', function () {
        const apiData = {
            ...DEFAULT_EMAIL_DESIGN,
            post_title_color: undefined,
            title_alignment: undefined,
            custom_future_field: '#123456'
        };

        const result = mapApiToDesignSettings(apiData as never) as typeof apiData;

        assert.equal(result.custom_future_field, '#123456');
    });

    it('preserves unexpected persisted design fields in the save payload while excluding preview-only fields', function () {
        const state = {
            designSettings: {
                ...DEFAULT_EMAIL_DESIGN,
                custom_future_field: '#abcdef'
            },
            generalSettings: {
                senderName: 'Ghost',
                replyToEmail: 'support@example.com',
                headerImage: '',
                showPublicationTitle: true,
                showBadge: false,
                emailFooter: ''
            }
        };

        const payload = buildAutomatedEmailDesignPayload(state as never) as typeof state.designSettings & {
            header_image: string | null;
            show_header_title: boolean;
            show_badge: boolean;
            footer_content: string | null;
        };

        assert.equal(payload.custom_future_field, '#abcdef');
        assert.equal('post_title_color' in payload, false);
        assert.equal('title_alignment' in payload, false);
    });
});
