import {buildGeneralTabDefinition} from '@src/components/settings/email/customization/tabs/build-tab-definitions';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {AutomationCustomizationFormState} from '@src/components/settings/email/customization/types';

vi.mock('@src/components/settings/email/verified-email-select', () => ({
    default: ({title, onChange}: {title?: string; onChange: (value: string) => void}) => {
        const nextValue = title === 'Reply-to email' ? 'reply@managed.example' : 'sender@managed.example';
        return (
            <button aria-label={title} type='button' onClick={() => onChange(nextValue)}>
                {title}
            </button>
        );
    }
}));

vi.mock('@src/components/settings/email/customization/fields/header-image-field', () => ({
    HeaderImageField: () => <div>Header image</div>
}));

vi.mock('@src/components/settings/email/customization/fields/email-footer-field', () => ({
    EmailFooterField: ({onChange, value: fieldValue}: {onChange: (value: string) => void; value: string}) => (
        <label>
            Email footer
            <input
                aria-label='Email footer'
                value={fieldValue}
                onChange={(event) => {
                    onChange(event.target.value);
                }}
            />
        </label>
    )
}));

describe('buildGeneralTabDefinition', function () {
    const formState: AutomationCustomizationFormState = {
        id: 'automation-1',
        sender_name: 'Sender',
        sender_email: 'hello@example.com',
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

    it('renders sender email and reply-to fields from email info context', function () {
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationFormState>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                emailInfoContext: {
                    showSenderEmailField: true,
                    senderEmailPlaceholder: 'hello@example.com',
                    replyToPlaceholder: 'hello@example.com',
                    renderedReplyToValue: ''
                },
                entity: {},
                errors: {},
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateFormState: () => {}
            })}</>
        );

        expect(screen.getByText('Sender name')).toBeInTheDocument();
        expect(screen.getByText('Sender email address')).toBeInTheDocument();
        expect(screen.getByText('Reply-to email')).toBeInTheDocument();
        expect(screen.getByText('Header image')).toBeInTheDocument();
        expect(screen.getByText('Publication title')).toBeInTheDocument();
        expect(screen.getByLabelText('Email footer')).toBeInTheDocument();
    });

    it('hides sender email field when email info context disables it', function () {
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationFormState>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                emailInfoContext: {
                    showSenderEmailField: false,
                    senderEmailPlaceholder: '',
                    replyToPlaceholder: 'hello@example.com',
                    renderedReplyToValue: ''
                },
                entity: {},
                errors: {},
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateFormState: () => {}
            })}</>
        );

        expect(screen.queryByText('Sender email address')).not.toBeInTheDocument();
        expect(screen.getByText('Reply-to email')).toBeInTheDocument();
    });

    it('updates formState on sender and reply-to changes', function () {
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationFormState>();
        const updateFormState = vi.fn();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                emailInfoContext: {
                    showSenderEmailField: true,
                    senderEmailPlaceholder: '',
                    replyToPlaceholder: '',
                    renderedReplyToValue: ''
                },
                entity: {},
                errors: {},
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateFormState
            })}</>
        );

        fireEvent.change(screen.getByLabelText('Sender email address'), {target: {value: 'team@example.com'}});
        fireEvent.change(screen.getByLabelText('Reply-to email'), {target: {value: 'reply@example.com'}});
        fireEvent.click(screen.getByLabelText('Publication title'));
        fireEvent.change(screen.getByLabelText('Email footer'), {target: {value: '<p>Footer</p>'}});

        expect(updateFormState).toHaveBeenCalledWith({sender_email: 'team@example.com'});
        expect(updateFormState).toHaveBeenCalledWith({sender_reply_to: 'reply@example.com'});
        expect(updateFormState).toHaveBeenCalledWith({show_header_title: true});
        expect(updateFormState).toHaveBeenCalledWith({footer_content: '<p>Footer</p>'});
    });

    it('renders verified email dropdowns for managed email and updates values', function () {
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationFormState>();
        const updateFormState = vi.fn();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                formState,
                emailInfoContext: {
                    showSenderEmailField: false,
                    senderEmailPlaceholder: '',
                    replyToPlaceholder: '',
                    renderedReplyToValue: '',
                    verifiedEmail: {
                        sender: {
                            context: {
                                type: 'automated_email',
                                id: 'automation-1',
                                property: 'sender_email',
                                source: 'email_customization'
                            },
                            placeholder: 'Sender email'
                        },
                        replyTo: {
                            context: {
                                type: 'automated_email',
                                id: 'automation-1',
                                property: 'sender_reply_to',
                                source: 'email_customization'
                            },
                            placeholder: 'Reply-to email'
                        }
                    }
                },
                entity: {},
                errors: {},
                siteIcon: null,
                siteTitle: 'Local Haunts',
                updateFormState
            })}</>
        );

        fireEvent.click(screen.getByRole('button', {name: 'Sender email address'}));
        fireEvent.click(screen.getByRole('button', {name: 'Reply-to email'}));

        expect(updateFormState).toHaveBeenCalledWith({sender_email: 'sender@managed.example'});
        expect(updateFormState).toHaveBeenCalledWith({sender_reply_to: 'reply@managed.example'});
    });
});
