import NewsletterPreview from '@src/components/settings/email/customization/previews/newsletter-preview';
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {NewsletterEmailPreviewModel} from '@src/components/settings/email/customization/types';

let commentsEnabledSetting = 'on';

vi.mock('@src/components/providers/global-data-provider', () => ({
    useGlobalData: () => ({
        config: {
            hostSettings: {
                managedEmail: {
                    enabled: true
                }
            }
        },
        currentUser: {
            name: 'Jamie Larson',
            email: 'jamie@example.com'
        },
        settings: [],
        siteData: {
            accent_color: '#f56500'
        }
    })
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    getSettingValues: (_settings: unknown, keys: string[]) => keys.map((key) => {
        if (key === 'title') {
            return 'Local Haunts';
        }

        if (key === 'icon') {
            return 'https://ghost.test/content/images/icon.png';
        }

        if (key === 'comments_enabled') {
            return commentsEnabledSetting;
        }

        if (key === 'default_email_address') {
            return 'default@example.com';
        }

        if (key === 'support_email_address') {
            return 'support@example.com';
        }

        return '';
    })
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    isManagedEmail: () => true,
    hasSendingDomain: () => false
}));

const baseModel: NewsletterEmailPreviewModel = {
    type: 'newsletter',
    name: 'Morning Edition',
    sender_name: 'Local Haunts',
    sender_email: 'newsletter@example.com',
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
    show_badge: true
};

describe('NewsletterPreview', function () {
    afterEach(function () {
        commentsEnabledSetting = 'on';
    });

    it('renders header icon, publication title and newsletter name subtitle', function () {
        render(<NewsletterPreview model={baseModel} />);

        expect(screen.getByText('Local Haunts')).toBeInTheDocument();
        expect(screen.getByText('Morning Edition')).toBeInTheDocument();
        expect(screen.getByText('Reply-to:')).toBeInTheDocument();
        expect(screen.getByText('support@example.com')).toBeInTheDocument();
        expect(screen.getByRole('presentation')).toHaveAttribute('src', 'https://ghost.test/content/images/icon.png');
        expect(screen.getByTestId('newsletter-preview-publication-title')).toHaveClass('text-center');
    });

    it('renders title section and hides excerpt when show_excerpt is false', function () {
        render(<NewsletterPreview model={{...baseModel, show_excerpt: false}} />);

        expect(screen.getByText('Your email newsletter')).toBeInTheDocument();
        expect(screen.queryByText('A subtitle to highlight key points and engage your readers.')).not.toBeInTheDocument();
    });

    it('renders feature image and latest posts sections when enabled', function () {
        render(<NewsletterPreview model={{...baseModel, show_latest_posts: true}} />);

        expect(screen.getByAltText('Feature')).toBeInTheDocument();
        expect(screen.getByText('Keep reading')).toBeInTheDocument();
    });

    it('renders footer html and badge based on footer settings', function () {
        render(<NewsletterPreview model={{...baseModel, footer_content: '<p>Footer legal text</p>', show_badge: true}} />);

        expect(screen.getByText('Footer legal text')).toBeInTheDocument();
        expect(screen.getByText('Powered by Ghost')).toBeInTheDocument();
    });

    it('shows comments CTA only when comments are enabled globally', function () {
        const {rerender} = render(<NewsletterPreview model={{...baseModel, show_comment_cta: true}} />);

        expect(screen.getByText('Comment')).toBeInTheDocument();

        commentsEnabledSetting = 'off';
        rerender(<NewsletterPreview model={{...baseModel, show_comment_cta: true}} />);

        expect(screen.queryByText('Comment')).not.toBeInTheDocument();
    });

    it('renders newsletter header image when set', function () {
        render(<NewsletterPreview model={{...baseModel, header_image: 'https://ghost.test/content/images/newsletter-header.png'}} />);

        const image = screen.getByTestId('newsletter-preview-header-image');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://ghost.test/content/images/newsletter-header.png');
    });
});
