import {buildNewsletterGeneralTabDefinition} from '@src/components/settings/email/customization/tabs/build-tab-definitions';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {NewsletterCustomizationDraft} from '@src/components/settings/email/customization/types';

const draft: NewsletterCustomizationDraft = {
    id: 'newsletter-1',
    name: 'Morning Edition',
    description: 'Description',
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
    feedback_enabled: true,
    show_comment_cta: true,
    show_latest_posts: false,
    show_subscription_details: false,
    footer_content: '',
    show_badge: true,
    subscribe_on_signup: true
};

describe('buildNewsletterGeneralTabDefinition', function () {
    it('renders member settings toggle', function () {
        const definition = buildNewsletterGeneralTabDefinition<unknown, NewsletterCustomizationDraft>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                draft,
                entity: {},
                errors: {},
                emailInfoContext: {
                    showSenderEmailField: true,
                    senderEmailPlaceholder: 'hello@example.com',
                    replyToPlaceholder: 'hello@example.com',
                    renderedReplyToValue: 'support@example.com'
                },
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateDraft: () => {}
            })}</>
        );

        expect(screen.getByText('Member settings')).toBeInTheDocument();
        expect(screen.getByText('Subscribe new members on signup')).toBeInTheDocument();
        expect(screen.getByText('Sender email address')).toBeInTheDocument();
        expect(screen.getByText('Reply-to email')).toBeInTheDocument();
    });

    it('renders status action row only when provided', function () {
        const definition = buildNewsletterGeneralTabDefinition<unknown, NewsletterCustomizationDraft>();
        const onClick = vi.fn();

        const {rerender} = render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                draft,
                entity: {},
                errors: {},
                emailInfoContext: {
                    showSenderEmailField: true,
                    senderEmailPlaceholder: 'hello@example.com',
                    replyToPlaceholder: 'hello@example.com',
                    renderedReplyToValue: 'support@example.com'
                },
                generalStatusAction: {
                    label: 'Archive newsletter',
                    color: 'red',
                    onClick
                },
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateDraft: () => {}
            })}</>
        );

        const statusButton = screen.getByRole('button', {name: 'Archive newsletter'});
        expect(statusButton).toBeInTheDocument();

        fireEvent.click(statusButton);
        expect(onClick).toHaveBeenCalledTimes(1);

        rerender(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                draft,
                entity: {},
                errors: {},
                emailInfoContext: {
                    showSenderEmailField: true,
                    senderEmailPlaceholder: 'hello@example.com',
                    replyToPlaceholder: 'hello@example.com',
                    renderedReplyToValue: 'support@example.com'
                },
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateDraft: () => {}
            })}</>
        );

        expect(screen.queryByRole('button', {name: 'Archive newsletter'})).not.toBeInTheDocument();
    });
});
