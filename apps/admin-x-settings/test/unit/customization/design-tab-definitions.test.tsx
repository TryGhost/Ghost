import {buildAutomationDesignTabDefinition, buildDesignTabDefinition} from '@src/components/settings/email/customization/tabs/build-tab-definitions';
import {render, screen} from '@testing-library/react';
import type {BaseEmailDesignDraft, EmailCustomizationDraft, NewsletterDesignDraft} from '@src/components/settings/email/customization/types';

type NewsletterDraft = EmailCustomizationDraft & BaseEmailDesignDraft & NewsletterDesignDraft;
type AutomationDraft = EmailCustomizationDraft & BaseEmailDesignDraft;

describe('design tab definitions', function () {
    it('renders newsletter-specific header controls', function () {
        const definition = buildDesignTabDefinition<unknown, NewsletterDraft>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                draft: {
                    id: 'newsletter-1',
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
                    divider_color: null
                },
                entity: {},
                errors: {},
                commentsEnabled: true,
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateDraft: () => {}
            })}</>
        );

        expect(screen.getByText('Post title color')).toBeInTheDocument();
        expect(screen.getByText('Title alignment')).toBeInTheDocument();
        expect(screen.getByText('Section title color')).toBeInTheDocument();
    });

    it('renders automation design controls without newsletter-only fields', function () {
        const definition = buildAutomationDesignTabDefinition<unknown, AutomationDraft>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                draft: {
                    id: 'automation-1',
                    sender_name: 'Sender',
                    sender_email: '',
                    sender_reply_to: '',
                    background_color: 'light',
                    header_background_color: 'transparent',
                    header_image: '',
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
                },
                entity: {},
                errors: {},
                commentsEnabled: true,
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateDraft: () => {}
            })}</>
        );

        expect(screen.getByText('Background color')).toBeInTheDocument();
        expect(screen.getByText('Heading font')).toBeInTheDocument();
        expect(screen.getByText('Header background color')).toBeInTheDocument();
        expect(screen.getByText('Heading color')).toBeInTheDocument();
        expect(screen.getByText('Button style')).toBeInTheDocument();
        expect(screen.getByText('Divider color')).toBeInTheDocument();
        expect(screen.queryByText('Post title color')).not.toBeInTheDocument();
        expect(screen.queryByText('Title alignment')).not.toBeInTheDocument();
    });
});
