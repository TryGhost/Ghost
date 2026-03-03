import {buildNewsletterGeneralTabDefinition} from '@src/components/settings/email/customization/tabs/build-tab-definitions';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {NewsletterCustomizationFormState} from '@src/components/settings/email/customization/types';

const verifiedEmailSelectCalls: Array<{title?: string; specialOptions?: Array<{value: string; label: string}>}> = [];

vi.mock('@src/components/settings/email/verified-email-select', () => ({
    default: ({title, specialOptions, onChange}: {title?: string; specialOptions?: Array<{value: string; label: string}>; onChange: (value: string) => void}) => {
        verifiedEmailSelectCalls.push({title, specialOptions});

        const nextValue = title === 'Reply-to email' ? 'support' : 'managed@example.com';

        return (
            <button aria-label={title} type='button' onClick={() => onChange(nextValue)}>
                {title}
            </button>
        );
    }
}));

const formState: NewsletterCustomizationFormState = {
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
    beforeEach(function () {
        verifiedEmailSelectCalls.length = 0;
    });

    it('renders member settings toggle', function () {
        const definition = buildNewsletterGeneralTabDefinition<unknown, NewsletterCustomizationFormState>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
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
                updateFormState: () => {}
            })}</>
        );

        expect(screen.getByText('Member settings')).toBeInTheDocument();
        expect(screen.getByText('Subscribe new members on signup')).toBeInTheDocument();
        expect(screen.getByText('Sender email address')).toBeInTheDocument();
        expect(screen.getByText('Reply-to email')).toBeInTheDocument();
    });

    it('renders verified email dropdowns for managed email and updates values', function () {
        const definition = buildNewsletterGeneralTabDefinition<unknown, NewsletterCustomizationFormState>();
        const updateFormState = vi.fn();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                entity: {},
                errors: {},
                emailInfoContext: {
                    showSenderEmailField: false,
                    senderEmailPlaceholder: 'hello@example.com',
                    replyToPlaceholder: 'hello@example.com',
                    renderedReplyToValue: 'support@example.com',
                    verifiedEmail: {
                        sender: {
                            context: {
                                type: 'newsletter',
                                id: 'newsletter-1',
                                property: 'sender_email',
                                source: 'email_customization'
                            },
                            placeholder: 'hello@example.com'
                        },
                        replyTo: {
                            context: {
                                type: 'newsletter',
                                id: 'newsletter-1',
                                property: 'sender_reply_to',
                                source: 'email_customization'
                            },
                            placeholder: 'hello@example.com',
                            specialOptions: [
                                {value: 'newsletter', label: 'Newsletter address'},
                                {value: 'support', label: 'Support address'}
                            ]
                        }
                    }
                },
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateFormState
            })}</>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Sender email address'}));
        fireEvent.click(screen.getByRole('button', {name: 'Reply-to email'}));

        expect(updateFormState).toHaveBeenCalledWith({sender_email: 'managed@example.com'});
        expect(updateFormState).toHaveBeenCalledWith({sender_reply_to: 'support'});

        const replyToCall = verifiedEmailSelectCalls.find(call => call.title === 'Reply-to email');
        expect(replyToCall?.specialOptions).toEqual([
            {value: 'newsletter', label: 'Newsletter address'},
            {value: 'support', label: 'Support address'}
        ]);
    });

    it('renders status action row only when provided', function () {
        const definition = buildNewsletterGeneralTabDefinition<unknown, NewsletterCustomizationFormState>();
        const onClick = vi.fn();

        const {rerender} = render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
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
                updateFormState: () => {}
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
                formState,
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
                updateFormState: () => {}
            })}</>
        );

        expect(screen.queryByRole('button', {name: 'Archive newsletter'})).not.toBeInTheDocument();
    });
});
