import AutomationPreview from '@src/components/settings/email/customization/previews/automation-preview';
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {AutomationEmailPreviewModel} from '@src/components/settings/email/customization/types';

vi.mock('@src/components/providers/global-data-provider', () => ({
    useGlobalData: () => ({
        config: {
            hostSettings: {
                managedEmail: {
                    enabled: true
                }
            }
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

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
    useActiveNewsletterSenderDefaults: () => ({
        data: {
            id: 'newsletter-1',
            sender_name: 'Local Haunts',
            sender_email: 'fallback@example.com',
            sender_reply_to: 'support'
        }
    })
}));

const baseModel: AutomationEmailPreviewModel = {
    type: 'automation',
    sender_name: 'Local Haunts',
    sender_email: '',
    sender_reply_to: '',
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
    divider_color: null
};

describe('AutomationPreview', function () {
    it('renders automation-specific heading semantics and copy', function () {
        render(<AutomationPreview model={baseModel} />);

        expect(screen.getByRole('heading', {level: 1, name: 'Welcome email'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {level: 2, name: 'Need inspiration?'})).toBeInTheDocument();
        expect(screen.getByText('support@example.com')).toBeInTheDocument();
        expect(screen.getByText('This is for welcome emails right now.')).toBeInTheDocument();
        expect(screen.queryByText('Your email newsletter')).not.toBeInTheDocument();
    });

    it('renders publication title only when enabled', function () {
        render(<AutomationPreview model={{...baseModel, show_header_title: true}} />);

        const publicationTitle = screen.getByTestId('automation-preview-publication-title');
        expect(publicationTitle).toHaveTextContent('Local Haunts');
        expect(publicationTitle).toHaveClass('text-center');
    });

    it('does not render publication title when disabled', function () {
        render(<AutomationPreview model={{...baseModel, show_header_title: false}} />);

        expect(screen.queryByTestId('automation-preview-publication-title')).not.toBeInTheDocument();
    });

    it('renders header image in header region when set', function () {
        render(<AutomationPreview model={{...baseModel, header_image: 'https://ghost.test/content/images/automation-header.png'}} />);

        const image = screen.getByTestId('automation-preview-header-image');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://ghost.test/content/images/automation-header.png');
    });

    it('does not render header image when unset', function () {
        render(<AutomationPreview model={{...baseModel, header_image: ''}} />);

        expect(screen.queryByTestId('automation-preview-header-image')).not.toBeInTheDocument();
    });

    it('renders footer content and adds safe link attributes', function () {
        render(<AutomationPreview model={{
            ...baseModel,
            footer_content: '<p>Footer text <a href=\"https://example.com\">link</a></p>'
        }} />);

        const footer = screen.getByTestId('automation-preview-footer');
        expect(footer).toBeInTheDocument();
        expect(footer.querySelector('a')).toHaveAttribute('target', '_blank');
        expect(footer.querySelector('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not render footer when footer content is empty', function () {
        render(<AutomationPreview model={{...baseModel, footer_content: ''}} />);

        expect(screen.queryByTestId('automation-preview-footer')).not.toBeInTheDocument();
    });

    it('maps heading color controls to automation heading levels and image corners', function () {
        render(<AutomationPreview model={{
            ...baseModel,
            header_image: 'https://ghost.test/content/images/automation-header.png',
            image_corners: 'rounded',
            title_font_category: 'serif',
            title_font_weight: 'semibold',
            section_title_color: '#112233'
        }} />);

        const topHeading = screen.getByRole('heading', {level: 1, name: 'Welcome email'});
        const sectionHeading = screen.getByRole('heading', {level: 2, name: 'Need inspiration?'});
        expect(topHeading).toHaveClass('font-serif');
        expect((topHeading as HTMLElement).style.color).toBe('rgb(17, 34, 51)');
        expect((sectionHeading as HTMLElement).style.color).toBe('rgb(17, 34, 51)');

        const image = screen.getByTestId('automation-preview-header-image');
        expect(image).toHaveClass('rounded-md');
        expect(image).toHaveClass('pt-6');
        expect(image).toHaveClass('mb-4');
    });

    it('applies header background color to the header region around image/title', function () {
        render(<AutomationPreview model={{
            ...baseModel,
            header_background_color: '#ff0000',
            header_image: 'https://ghost.test/content/images/automation-header.png',
            show_header_title: true
        }} />);

        const headerRegion = screen.getByTestId('automation-preview-header-region');
        expect((headerRegion as HTMLElement).style.backgroundColor).toBe('rgb(255, 0, 0)');
        expect(headerRegion).not.toHaveClass('py-8');
        expect(headerRegion.querySelector('h1')).toBeNull();
        expect(screen.getByTestId('automation-preview-header-image')).toBeInTheDocument();
    });
});
