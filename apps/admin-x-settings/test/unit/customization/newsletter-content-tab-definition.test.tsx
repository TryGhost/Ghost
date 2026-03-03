import {buildNewsletterContentTabDefinition} from '@src/components/settings/email/customization/tabs/build-tab-definitions';
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {NewsletterCustomizationFormState} from '@src/components/settings/email/customization/types';

vi.mock('@src/components/settings/email/customization/fields/header-image-field', () => ({
    HeaderImageField: () => <div>Header image</div>
}));

const formState: NewsletterCustomizationFormState = {
    id: 'newsletter-1',
    name: 'Morning Edition',
    description: 'Description',
    sender_name: 'Sender',
    sender_email: '',
    sender_reply_to: 'newsletter',
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

describe('buildNewsletterContentTabDefinition', function () {
    it('renders newsletter content sections and controls', function () {
        const definition = buildNewsletterContentTabDefinition<unknown, NewsletterCustomizationFormState>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                entity: {},
                errors: {},
                siteIcon: 'https://ghost.test/content/images/icon.png',
                siteTitle: 'Local Haunts',
                updateFormState: () => {}
            })}</>
        );

        expect(screen.getByText('Header')).toBeInTheDocument();
        expect(screen.getByText('Publication icon')).toBeInTheDocument();
        expect(screen.getByText('Publication title')).toBeInTheDocument();
        expect(screen.getByText('Newsletter name')).toBeInTheDocument();
        expect(screen.getByText('Title section')).toBeInTheDocument();
        expect(screen.getByText('Post title')).toBeInTheDocument();
        expect(screen.getByText('Post excerpt')).toBeInTheDocument();
        expect(screen.getByText('Feature image')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
        expect(screen.getByText('Ask your readers for feedback')).toBeInTheDocument();
        expect(screen.getByText('Add a link to your comments')).toBeInTheDocument();
        expect(screen.getByText('Share your latest posts')).toBeInTheDocument();
        expect(screen.getByText('Show subscription details')).toBeInTheDocument();
        expect(screen.getByText('Email footer')).toBeInTheDocument();
        expect(screen.getByText('Promote independent publishing')).toBeInTheDocument();
    });

    it('hides publication icon toggle when site icon is unavailable', function () {
        const definition = buildNewsletterContentTabDefinition<unknown, NewsletterCustomizationFormState>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                entity: {},
                errors: {},
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateFormState: () => {}
            })}</>
        );

        expect(screen.queryByText('Publication icon')).not.toBeInTheDocument();
    });

    it('hides comments CTA toggle when comments are disabled', function () {
        const definition = buildNewsletterContentTabDefinition<unknown, NewsletterCustomizationFormState>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: false,
                formState,
                entity: {},
                errors: {},
                siteIcon: 'https://ghost.test/content/images/icon.png',
                siteTitle: 'Local Haunts',
                updateFormState: () => {}
            })}</>
        );

        expect(screen.queryByText('Add a link to your comments')).not.toBeInTheDocument();
    });
});
