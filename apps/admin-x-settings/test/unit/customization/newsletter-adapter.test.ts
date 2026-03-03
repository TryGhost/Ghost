import * as assert from 'assert/strict';
import {type Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {getNewsletterGeneralStatusAction, newsletterAdapter} from '@src/components/settings/email/customization/adapters/newsletter-adapter';
import {showToast} from '@tryghost/admin-x-design-system';
import {vi} from 'vitest';
import type {Config} from '@tryghost/admin-x-framework/api/config';

vi.mock('@tryghost/admin-x-design-system', async () => {
    const actual = await vi.importActual('@tryghost/admin-x-design-system');

    return {
        ...actual,
        showToast: vi.fn()
    };
});

describe('newsletterAdapter', function () {
    beforeEach(function () {
        vi.clearAllMocks();
    });

    it('maps entity newsletter fields to draft', function () {
        const entity = {
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: null,
            title_font_category: 'serif',
            title_font_weight: 'semibold',
            body_font_category: 'serif',
            post_title_color: null,
            title_alignment: 'left',
            section_title_color: 'accent',
            button_color: '#112233',
            button_style: 'outline',
            button_corners: 'pill',
            link_color: '#aabbcc',
            link_style: 'bold',
            image_corners: 'rounded',
            divider_color: 'accent',
            description: null,
            id: 'newsletter-1',
            name: 'Morning Edition',
            show_header_icon: false,
            show_header_title: true,
            show_header_name: false,
            show_post_title_section: false,
            show_excerpt: false,
            show_feature_image: false,
            feedback_enabled: true,
            show_comment_cta: false,
            show_latest_posts: true,
            show_subscription_details: true,
            footer_content: '<p>Footer</p>',
            show_badge: false,
            subscribe_on_signup: false,
            sender_name: null,
            sender_email: null,
            sender_reply_to: 'newsletter'
        } as Newsletter;

        const draft = newsletterAdapter.createDraft({id: 'newsletter-1', entity});

        assert.deepEqual(draft, {
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: '',
            title_font_category: 'serif',
            title_font_weight: 'bold',
            body_font_category: 'serif',
            post_title_color: null,
            title_alignment: 'left',
            section_title_color: 'accent',
            button_color: '#112233',
            button_style: 'outline',
            button_corners: 'pill',
            link_color: '#aabbcc',
            link_style: 'bold',
            image_corners: 'rounded',
            divider_color: 'accent',
            description: '',
            id: 'newsletter-1',
            name: 'Morning Edition',
            show_header_icon: false,
            show_header_title: true,
            show_header_name: false,
            show_post_title_section: false,
            show_excerpt: false,
            show_feature_image: false,
            feedback_enabled: true,
            show_comment_cta: false,
            show_latest_posts: true,
            show_subscription_details: true,
            footer_content: '<p>Footer</p>',
            show_badge: false,
            subscribe_on_signup: false,
            sender_name: '',
            sender_email: '',
            sender_reply_to: 'newsletter'
        });
    });

    it('saves draft fields with normalized payload values', async function () {
        const entity = {
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: null,
            description: null,
            id: 'newsletter-1',
            name: 'Original Name',
            show_header_icon: true,
            show_header_title: true,
            show_header_name: true,
            show_post_title_section: true,
            show_excerpt: true,
            show_feature_image: true,
            feedback_enabled: false,
            show_comment_cta: true,
            show_latest_posts: false,
            show_subscription_details: false,
            footer_content: null,
            show_badge: true,
            subscribe_on_signup: true,
            sender_name: 'Original',
            sender_email: null,
            sender_reply_to: 'newsletter'
        } as Newsletter;

        const withName: {payload?: Newsletter} = {};
        await newsletterAdapter.saveDraft({
            id: entity.id,
            entity,
            editEntity: async (payload) => {
                withName.payload = payload;
            },
            draft: {
                background_color: '#ff0000',
                header_background_color: '#112233',
                header_image: ' https://ghost.test/content/images/header.png ',
                title_font_category: 'sans_serif',
                title_font_weight: 'medium',
                body_font_category: 'serif',
                post_title_color: '#fedcba',
                title_alignment: 'left',
                section_title_color: 'accent',
                button_color: null,
                button_style: 'outline',
                button_corners: 'pill',
                link_color: '#123456',
                link_style: 'bold',
                image_corners: 'rounded',
                divider_color: 'accent',
                description: ' Weekly updates ',
                id: 'newsletter-1',
                name: 'Updated Name',
                sender_name: ' Updated Name ',
                sender_email: ' updated@example.com ',
                sender_reply_to: ' support@example.com ',
                show_header_icon: false,
                show_header_title: true,
                show_header_name: false,
                show_post_title_section: true,
                show_excerpt: false,
                show_feature_image: false,
                feedback_enabled: true,
                show_comment_cta: false,
                show_latest_posts: true,
                show_subscription_details: true,
                footer_content: '<p>Footer content</p>',
                show_badge: false,
                subscribe_on_signup: false
            }
        });
        const withoutName: {payload?: Newsletter} = {};
        await newsletterAdapter.saveDraft({
            id: entity.id,
            entity,
            editEntity: async (payload) => {
                withoutName.payload = payload;
            },
            draft: {
                background_color: '',
                header_background_color: '',
                header_image: '   ',
                title_font_category: 'serif',
                title_font_weight: 'bold',
                body_font_category: 'sans_serif',
                post_title_color: null,
                title_alignment: 'center',
                section_title_color: null,
                button_color: 'accent',
                button_style: 'fill',
                button_corners: 'rounded',
                link_color: 'accent',
                link_style: 'underline',
                image_corners: 'square',
                divider_color: null,
                description: '',
                id: 'newsletter-1',
                name: 'Updated Name',
                sender_name: '   ',
                sender_email: '   ',
                sender_reply_to: '   ',
                show_header_icon: true,
                show_header_title: false,
                show_header_name: true,
                show_post_title_section: false,
                show_excerpt: true,
                show_feature_image: true,
                feedback_enabled: false,
                show_comment_cta: true,
                show_latest_posts: false,
                show_subscription_details: false,
                footer_content: '',
                show_badge: true,
                subscribe_on_signup: true
            }
        });

        assert.equal(withName.payload?.background_color, '#ff0000');
        assert.equal(withName.payload?.header_background_color, '#112233');
        assert.equal(withName.payload?.header_image, 'https://ghost.test/content/images/header.png');
        assert.equal(withName.payload?.title_font_category, 'sans_serif');
        assert.equal(withName.payload?.title_font_weight, 'medium');
        assert.equal(withName.payload?.body_font_category, 'serif');
        assert.equal(withName.payload?.post_title_color, '#fedcba');
        assert.equal(withName.payload?.title_alignment, 'left');
        assert.equal(withName.payload?.section_title_color, 'accent');
        assert.equal(withName.payload?.button_color, null);
        assert.equal(withName.payload?.button_style, 'outline');
        assert.equal(withName.payload?.button_corners, 'pill');
        assert.equal(withName.payload?.link_color, '#123456');
        assert.equal(withName.payload?.link_style, 'bold');
        assert.equal(withName.payload?.image_corners, 'rounded');
        assert.equal(withName.payload?.divider_color, 'accent');
        assert.equal(withName.payload?.description, ' Weekly updates ');
        assert.equal(withName.payload?.name, 'Updated Name');
        assert.equal(withName.payload?.sender_name, 'Updated Name');
        assert.equal(withName.payload?.sender_email, 'updated@example.com');
        assert.equal(withName.payload?.sender_reply_to, 'support@example.com');
        assert.equal(withName.payload?.show_header_icon, false);
        assert.equal(withName.payload?.show_header_title, true);
        assert.equal(withName.payload?.show_header_name, false);
        assert.equal(withName.payload?.show_post_title_section, true);
        assert.equal(withName.payload?.show_excerpt, false);
        assert.equal(withName.payload?.show_feature_image, false);
        assert.equal(withName.payload?.feedback_enabled, true);
        assert.equal(withName.payload?.show_comment_cta, false);
        assert.equal(withName.payload?.show_latest_posts, true);
        assert.equal(withName.payload?.show_subscription_details, true);
        assert.equal(withName.payload?.footer_content, '<p>Footer content</p>');
        assert.equal(withName.payload?.show_badge, false);
        assert.equal(withName.payload?.subscribe_on_signup, false);

        assert.equal(withoutName.payload?.background_color, 'light');
        assert.equal(withoutName.payload?.header_background_color, 'transparent');
        assert.equal(withoutName.payload?.header_image, null);
        assert.equal(withoutName.payload?.title_font_category, 'serif');
        assert.equal(withoutName.payload?.title_font_weight, 'bold');
        assert.equal(withoutName.payload?.body_font_category, 'sans_serif');
        assert.equal(withoutName.payload?.post_title_color, null);
        assert.equal(withoutName.payload?.title_alignment, 'center');
        assert.equal(withoutName.payload?.section_title_color, null);
        assert.equal(withoutName.payload?.button_color, 'accent');
        assert.equal(withoutName.payload?.button_style, 'fill');
        assert.equal(withoutName.payload?.button_corners, 'rounded');
        assert.equal(withoutName.payload?.link_color, 'accent');
        assert.equal(withoutName.payload?.link_style, 'underline');
        assert.equal(withoutName.payload?.image_corners, 'square');
        assert.equal(withoutName.payload?.divider_color, null);
        assert.equal(withoutName.payload?.description, null);
        assert.equal(withoutName.payload?.sender_name, null);
        assert.equal(withoutName.payload?.sender_email, null);
        assert.equal(withoutName.payload?.sender_reply_to, 'newsletter');
        assert.equal(withoutName.payload?.show_header_icon, true);
        assert.equal(withoutName.payload?.show_header_title, false);
        assert.equal(withoutName.payload?.show_header_name, true);
        assert.equal(withoutName.payload?.show_post_title_section, false);
        assert.equal(withoutName.payload?.show_excerpt, true);
        assert.equal(withoutName.payload?.show_feature_image, true);
        assert.equal(withoutName.payload?.feedback_enabled, false);
        assert.equal(withoutName.payload?.show_comment_cta, true);
        assert.equal(withoutName.payload?.show_latest_posts, false);
        assert.equal(withoutName.payload?.show_subscription_details, false);
        assert.equal(withoutName.payload?.footer_content, null);
        assert.equal(withoutName.payload?.show_badge, true);
        assert.equal(withoutName.payload?.subscribe_on_signup, true);
    });

    it('builds newsletter preview model from draft', function () {
        const model = newsletterAdapter.buildPreviewModel({
            background_color: '#112233',
            header_background_color: '#445566',
            header_image: 'https://ghost.test/content/images/header.png',
            title_font_category: 'sans_serif',
            title_font_weight: 'semibold',
            body_font_category: 'serif',
            post_title_color: 'accent',
            title_alignment: 'center',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: '#abcdef',
            link_style: 'regular',
            image_corners: 'square',
            divider_color: '#e0e7eb',
            description: '',
            id: 'newsletter-1',
            name: 'Morning Edition',
            sender_name: 'Local Haunts',
            sender_email: 'news@example.com',
            sender_reply_to: 'newsletter',
            show_header_icon: true,
            show_header_title: true,
            show_header_name: true,
            show_post_title_section: false,
            show_excerpt: true,
            show_feature_image: true,
            feedback_enabled: false,
            show_comment_cta: true,
            show_latest_posts: false,
            show_subscription_details: false,
            footer_content: '<p>Footer</p>',
            show_badge: true,
            subscribe_on_signup: true
        });

        assert.deepEqual(model, {
            background_color: '#112233',
            header_background_color: '#445566',
            header_image: 'https://ghost.test/content/images/header.png',
            title_font_category: 'sans_serif',
            title_font_weight: 'semibold',
            body_font_category: 'serif',
            post_title_color: 'accent',
            title_alignment: 'center',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: '#abcdef',
            link_style: 'regular',
            image_corners: 'square',
            divider_color: '#e0e7eb',
            name: 'Morning Edition',
            sender_name: 'Local Haunts',
            sender_email: 'news@example.com',
            sender_reply_to: 'newsletter',
            show_header_icon: true,
            show_header_title: true,
            show_header_name: true,
            show_post_title_section: false,
            show_excerpt: true,
            show_feature_image: true,
            feedback_enabled: false,
            show_comment_cta: true,
            show_latest_posts: false,
            show_subscription_details: false,
            footer_content: '<p>Footer</p>',
            show_badge: true,
            type: 'newsletter'
        });
    });

    it('validates required newsletter name', function () {
        const errors = newsletterAdapter.validateDraft?.({
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: '',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            post_title_color: null,
            title_alignment: 'center',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: null,
            description: '',
            id: 'newsletter-1',
            name: '  ',
            sender_name: 'Sender',
            sender_email: '',
            sender_reply_to: '',
            show_header_icon: true,
            show_header_title: true,
            show_header_name: true,
            show_post_title_section: true,
            show_excerpt: true,
            show_feature_image: true,
            feedback_enabled: false,
            show_comment_cta: true,
            show_latest_posts: false,
            show_subscription_details: false,
            footer_content: '',
            show_badge: true,
            subscribe_on_signup: true
        }, {config: {hostSettings: {managedEmail: {}}} as Config});

        assert.equal(errors?.name, 'A name is required for your newsletter');
    });

    it('validates sender email domain and reply-to formats', function () {
        const errors = newsletterAdapter.validateDraft?.({
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: '',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            post_title_color: null,
            title_alignment: 'center',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: null,
            description: '',
            id: 'newsletter-1',
            name: 'Morning Edition',
            sender_name: 'Sender',
            sender_email: 'name@wrong.com',
            sender_reply_to: 'not-an-email',
            show_header_icon: true,
            show_header_title: true,
            show_header_name: true,
            show_post_title_section: true,
            show_excerpt: true,
            show_feature_image: true,
            feedback_enabled: false,
            show_comment_cta: true,
            show_latest_posts: false,
            show_subscription_details: false,
            footer_content: '',
            show_badge: true,
            subscribe_on_signup: true
        }, {
            config: {
                hostSettings: {
                    managedEmail: {
                        sendingDomain: 'example.com'
                    }
                }
            } as Config
        });

        assert.equal(errors?.sender_email, 'Email address must end with @example.com');
        assert.equal(errors?.sender_reply_to, 'Enter a valid email address');
    });

    it('shows verification toast when newsletter email verification is triggered', async function () {
        const entity = {
            id: 'newsletter-1',
            name: 'Morning Edition'
        } as Newsletter;

        await newsletterAdapter.saveDraft({
            id: 'newsletter-1',
            entity,
            editEntity: async () => ({
                newsletters: [entity],
                meta: {
                    sent_email_verification: ['sender_email']
                }
            }),
            draft: {
                id: 'newsletter-1',
                name: 'Morning Edition',
                description: '',
                sender_name: 'Sender',
                sender_email: 'hello@example.com',
                sender_reply_to: 'support',
                background_color: 'light',
                header_background_color: 'transparent',
                header_image: '',
                title_font_category: 'sans_serif',
                title_font_weight: 'bold',
                body_font_category: 'sans_serif',
                post_title_color: null,
                title_alignment: 'center',
                section_title_color: null,
                button_color: 'accent',
                button_style: 'fill',
                button_corners: 'rounded',
                link_color: 'accent',
                link_style: 'underline',
                image_corners: 'square',
                divider_color: null,
                show_header_icon: true,
                show_header_title: true,
                show_header_name: true,
                show_post_title_section: true,
                show_excerpt: true,
                show_feature_image: true,
                feedback_enabled: false,
                show_comment_cta: true,
                show_latest_posts: false,
                show_subscription_details: false,
                footer_content: '',
                show_badge: true,
                subscribe_on_signup: true
            }
        });

        assert.equal(vi.mocked(showToast).mock.calls.length, 1);
    });

    it('returns archive status action only when active newsletter count is greater than one', function () {
        const onArchive = () => {};
        const onReactivate = () => {};

        const action = getNewsletterGeneralStatusAction({
            status: 'active',
            activeNewsletterCount: 2,
            onArchive,
            onReactivate
        });

        assert.equal(action?.label, 'Archive newsletter');
        assert.equal(action?.color, 'red');
        assert.equal(action?.onClick, onArchive);
    });

    it('hides archive action when active newsletter count is one or unknown', function () {
        const onArchive = () => {};
        const onReactivate = () => {};

        assert.equal(getNewsletterGeneralStatusAction({
            status: 'active',
            activeNewsletterCount: 1,
            onArchive,
            onReactivate
        }), undefined);

        assert.equal(getNewsletterGeneralStatusAction({
            status: 'active',
            onArchive,
            onReactivate
        }), undefined);
    });

    it('returns reactivate action for archived newsletters', function () {
        const onArchive = () => {};
        const onReactivate = () => {};

        const action = getNewsletterGeneralStatusAction({
            status: 'archived',
            activeNewsletterCount: 1,
            onArchive,
            onReactivate
        });

        assert.equal(action?.label, 'Reactivate newsletter');
        assert.equal(action?.color, 'green');
        assert.equal(action?.onClick, onReactivate);
    });
});
