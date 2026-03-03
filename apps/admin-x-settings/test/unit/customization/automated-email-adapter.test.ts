import * as assert from 'assert/strict';
import {type AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {type EmailTemplate} from '@tryghost/admin-x-framework/api/email-templates';
import {automatedEmailAdapter} from '@src/components/settings/email/customization/adapters/automated-email-adapter';
import type {Config} from '@tryghost/admin-x-framework/api/config';

const makeTemplate = (overrides: Partial<EmailTemplate> = {}): EmailTemplate => ({
    id: 'template-1',
    slug: 'automated-email',
    background_color: 'light',
    header_background_color: 'transparent',
    header_image: null,
    show_header_title: false,
    footer_content: null,
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    ...overrides
});

const makeAdditionalData = (template: EmailTemplate) => ({
    template,
    editTemplate: async () => {}
});

describe('automatedEmailAdapter', function () {
    it('uses default automation design values when no template data is provided', function () {
        const formState = automatedEmailAdapter.createFormState({
            id: 'email-1',
            entity: {
                id: 'email-1',
                sender_name: null,
                sender_email: null,
                sender_reply_to: null
            } as AutomatedEmail
        });

        assert.equal(formState.show_header_title, false);
        assert.equal(formState.footer_content, '');
        assert.equal(formState.background_color, 'light');
        assert.equal(formState.button_style, 'fill');
    });

    it('maps entity sender fields and template design to formState', function () {
        const entity = {
            id: 'email-1',
            sender_name: 'Test Sender',
            sender_email: 'test@example.com',
            sender_reply_to: 'reply@example.com'
        } as AutomatedEmail;

        const template = makeTemplate({
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

        const formState = automatedEmailAdapter.createFormState({
            id: 'email-1',
            entity,
            additionalData: makeAdditionalData(template)
        });

        assert.deepEqual(formState, {
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
            sender_name: 'Test Sender',
            sender_email: 'test@example.com',
            sender_reply_to: 'reply@example.com'
        });
    });

    it('saves sender_name via API payload and design via template API', async function () {
        const entity = {
            id: 'email-1',
            sender_name: 'Original',
            sender_email: null,
            sender_reply_to: null
        } as AutomatedEmail;

        const template = makeTemplate();
        const capturedTemplatePayloads: unknown[] = [];

        const withName: {payload?: AutomatedEmail} = {};
        await automatedEmailAdapter.saveFormState({
            id: entity.id,
            formState: {
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
            },
            additionalData: {
                template,
                editTemplate: async (payload: unknown) => {
                    capturedTemplatePayloads.push(payload);
                }
            }
        });

        assert.equal(withName.payload?.sender_name, 'Updated Name');
        assert.equal(withName.payload?.sender_email, 'updates@example.com');
        assert.equal(withName.payload?.sender_reply_to, 'replies@example.com');

        // Verify template was also saved
        assert.equal(capturedTemplatePayloads.length, 1);
        const templatePayload = capturedTemplatePayloads[0] as Record<string, unknown>;
        assert.equal(templatePayload.background_color, '#ff00ff');
        assert.equal(templatePayload.button_style, 'outline');
        assert.equal(templatePayload.slug, 'automated-email');
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
        const errors = automatedEmailAdapter.validateFormState?.({
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
