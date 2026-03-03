import * as assert from 'assert/strict';
import {type AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {automatedEmailAdapter} from '@src/components/settings/email/customization/adapters/automated-email-adapter';
import {readAutomationDesignState, writeAutomationDesignState} from '@src/components/settings/email/customization/stores/automation-design-state';
import type {Config} from '@tryghost/admin-x-framework/api/config';

describe('automatedEmailAdapter', function () {
    beforeEach(function () {
        localStorage.clear();
    });

    it('uses default automation content values when store is empty', function () {
        const draft = automatedEmailAdapter.createDraft({
            id: 'email-1',
            entity: {
                id: 'email-1',
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            } as AutomatedEmail
        });

        assert.equal(draft.show_header_title, false);
        assert.equal(draft.footer_content, '');
    });

    it('maps entity sender_name and design state to draft', function () {
        const entity = {
            id: 'email-1',
            sender_name: null,
            sender_email: null,
            sender_reply_to: null
        } as AutomatedEmail;

        writeAutomationDesignState({
            background_color: '#223344',
            header_background_color: '#334455',
            header_image: 'https://ghost.test/content/images/header.png',
            show_header_title: true,
            footer_content: '<p>Footer</p>',
            title_font_category: 'serif',
            title_font_weight: 'semibold',
            body_font_category: 'serif',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'outline',
            button_corners: 'pill',
            link_color: '#123456',
            link_style: 'bold',
            image_corners: 'rounded',
            divider_color: 'accent'
        });
        const draft = automatedEmailAdapter.createDraft({id: 'email-1', entity});

        assert.deepEqual(draft, {
            background_color: '#223344',
            header_background_color: '#334455',
            header_image: 'https://ghost.test/content/images/header.png',
            show_header_title: true,
            footer_content: '<p>Footer</p>',
            title_font_category: 'serif',
            title_font_weight: 'bold',
            body_font_category: 'serif',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'outline',
            button_corners: 'pill',
            link_color: '#123456',
            link_style: 'bold',
            image_corners: 'rounded',
            divider_color: 'accent',
            id: 'email-1',
            sender_name: '',
            sender_email: '',
            sender_reply_to: ''
        });
    });

    it('saves sender_name via API payload and keeps automation-only fields out', async function () {
        const entity = {
            id: 'email-1',
            sender_name: 'Original',
            sender_email: null,
            sender_reply_to: null
        } as AutomatedEmail;

        const withName: {payload?: AutomatedEmail} = {};
        await automatedEmailAdapter.saveDraft({
            id: entity.id,
            draft: {
                background_color: '#ff00ff',
                header_background_color: '#123456',
                header_image: 'https://ghost.test/content/images/header-a.png',
                show_header_title: true,
                footer_content: '<p>Footer</p>',
                title_font_category: 'sans_serif',
                title_font_weight: 'semibold',
                body_font_category: 'serif',
                section_title_color: 'accent',
                button_color: null,
                button_style: 'outline',
                button_corners: 'pill',
                link_color: '#123456',
                link_style: 'bold',
                image_corners: 'rounded',
                divider_color: 'accent',
                id: 'email-1',
                sender_name: ' Updated Name ',
                sender_email: ' updates@example.com ',
                sender_reply_to: ' replies@example.com '
            },
            entity,
            editEntity: async (payload) => {
                withName.payload = payload;
            }
        });

        const withoutName: {payload?: AutomatedEmail} = {};
        await automatedEmailAdapter.saveDraft({
            id: entity.id,
            draft: {
                background_color: '#00ff00',
                header_background_color: '#654321',
                header_image: '',
                show_header_title: false,
                footer_content: '',
                title_font_category: 'serif',
                title_font_weight: 'bold',
                body_font_category: 'sans_serif',
                section_title_color: null,
                button_color: 'accent',
                button_style: 'fill',
                button_corners: 'rounded',
                link_color: 'accent',
                link_style: 'underline',
                image_corners: 'square',
                divider_color: null,
                id: 'email-1',
                sender_name: '   ',
                sender_email: '  ',
                sender_reply_to: '  '
            },
            entity,
            editEntity: async (payload) => {
                withoutName.payload = payload;
            }
        });

        assert.equal(withName.payload?.sender_name, 'Updated Name');
        assert.equal(withName.payload?.sender_email, 'updates@example.com');
        assert.equal(withName.payload?.sender_reply_to, 'replies@example.com');
        assert.equal(withoutName.payload?.sender_name, null);
        assert.equal(withoutName.payload?.sender_email, null);
        assert.equal(withoutName.payload?.sender_reply_to, null);
    });

    it('saves background color to shared design state', async function () {
        const initialState = readAutomationDesignState();

        assert.deepEqual(initialState, {});

        await automatedEmailAdapter.saveDraft({
            id: 'email-1',
            draft: {
                background_color: '#112233',
                header_background_color: '#445566',
                header_image: 'https://ghost.test/content/images/header.png',
                show_header_title: true,
                footer_content: '<p>Footer</p>',
                title_font_category: 'sans_serif',
                title_font_weight: 'medium',
                body_font_category: 'serif',
                section_title_color: 'accent',
                button_color: null,
                button_style: 'outline',
                button_corners: 'pill',
                link_color: '#abcdef',
                link_style: 'regular',
                image_corners: 'rounded',
                divider_color: 'accent',
                id: 'email-1',
                sender_name: 'Sender',
                sender_email: 'sender@example.com',
                sender_reply_to: 'reply@example.com'
            },
            entity: {
                id: 'email-1',
                sender_name: 'Sender',
                sender_email: null,
                sender_reply_to: null
            } as AutomatedEmail,
            editEntity: async () => {}
        });

        const loadedDraft = automatedEmailAdapter.createDraft({
            id: 'email-2',
            entity: {
                id: 'email-2',
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            } as AutomatedEmail
        });
        const storedState = readAutomationDesignState();

        assert.equal(loadedDraft.background_color, '#112233');
        assert.equal(loadedDraft.header_background_color, '#445566');
        assert.equal(loadedDraft.header_image, 'https://ghost.test/content/images/header.png');
        assert.equal(loadedDraft.show_header_title, true);
        assert.equal(loadedDraft.footer_content, '<p>Footer</p>');
        assert.equal(loadedDraft.title_font_category, 'sans_serif');
        assert.equal(loadedDraft.title_font_weight, 'medium');
        assert.equal(loadedDraft.body_font_category, 'serif');
        assert.equal(loadedDraft.section_title_color, 'accent');
        assert.equal(loadedDraft.button_color, null);
        assert.equal(loadedDraft.button_style, 'outline');
        assert.equal(loadedDraft.button_corners, 'pill');
        assert.equal(loadedDraft.link_color, '#abcdef');
        assert.equal(loadedDraft.link_style, 'regular');
        assert.equal(loadedDraft.image_corners, 'rounded');
        assert.equal(loadedDraft.divider_color, 'accent');
        assert.equal(storedState.background_color, '#112233');
        assert.equal(storedState.header_background_color, '#445566');
        assert.equal(storedState.header_image, 'https://ghost.test/content/images/header.png');
        assert.equal(storedState.show_header_title, true);
        assert.equal(storedState.footer_content, '<p>Footer</p>');
        assert.equal(storedState.title_font_category, 'sans_serif');
        assert.equal(storedState.title_font_weight, 'medium');
        assert.equal(storedState.body_font_category, 'serif');
        assert.equal(storedState.section_title_color, 'accent');
        assert.equal(storedState.button_color, null);
        assert.equal(storedState.button_style, 'outline');
        assert.equal(storedState.button_corners, 'pill');
        assert.equal(storedState.link_color, '#abcdef');
        assert.equal(storedState.link_style, 'regular');
        assert.equal(storedState.image_corners, 'rounded');
        assert.equal(storedState.divider_color, 'accent');
    });

    it('builds automation preview model without newsletter content fields', function () {
        const model = automatedEmailAdapter.buildPreviewModel({
            background_color: '#abcdef',
            header_background_color: '#fedcba',
            header_image: 'https://ghost.test/content/images/header.png',
            show_header_title: true,
            footer_content: '<p>Footer</p>',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'serif',
            section_title_color: 'accent',
            button_color: null,
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: 'accent',
            id: 'email-1',
            sender_name: 'Sender',
            sender_email: 'sender@example.com',
            sender_reply_to: 'reply@example.com'
        });

        assert.equal(model.type, 'automation');
        assert.equal(model.sender_name, 'Sender');
        assert.equal(model.sender_email, 'sender@example.com');
        assert.equal(model.sender_reply_to, 'reply@example.com');
        assert.equal(model.background_color, '#abcdef');
        assert.equal(model.header_background_color, '#fedcba');
        assert.equal(model.header_image, 'https://ghost.test/content/images/header.png');
        assert.equal(model.show_header_title, true);
        assert.equal(model.footer_content, '<p>Footer</p>');
        assert.equal(model.title_font_category, 'sans_serif');
        assert.equal(model.title_font_weight, 'bold');
        assert.equal(model.body_font_category, 'serif');
        assert.equal(model.section_title_color, 'accent');
        assert.equal(model.button_color, null);
        assert.equal(model.button_style, 'fill');
        assert.equal(model.button_corners, 'rounded');
        assert.equal(model.link_color, 'accent');
        assert.equal(model.link_style, 'underline');
        assert.equal(model.image_corners, 'square');
        assert.equal(model.divider_color, 'accent');
        assert.equal('post_title_color' in model, false);
        assert.equal('title_alignment' in model, false);
        assert.equal('show_post_title_section' in model, false);
        assert.equal('show_excerpt' in model, false);
    });

    it('validates automation sender fields', function () {
        const errors = automatedEmailAdapter.validateDraft?.({
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: '',
            show_header_title: false,
            footer_content: '',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: null,
            id: 'email-1',
            sender_name: 'Sender',
            sender_email: 'not-an-email',
            sender_reply_to: 'invalid-reply'
        }, {config: {hostSettings: {managedEmail: {}}} as Config});

        assert.equal(errors?.sender_email, 'Enter a valid email address');
        assert.equal(errors?.sender_reply_to, 'Enter a valid email address');
    });
});
