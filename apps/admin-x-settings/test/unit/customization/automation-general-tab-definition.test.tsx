import {buildGeneralTabDefinition} from '@src/components/settings/email/customization/tabs/build-tab-definitions';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import type {AutomationCustomizationDraft} from '@src/components/settings/email/customization/types';

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
    const draft: AutomationCustomizationDraft = {
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
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationDraft>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                draft,
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
                updateDraft: () => {}
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
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationDraft>();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                draft,
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
                updateDraft: () => {}
            })}</>
        );

        expect(screen.queryByText('Sender email address')).not.toBeInTheDocument();
        expect(screen.getByText('Reply-to email')).toBeInTheDocument();
    });

    it('updates draft on sender and reply-to changes', function () {
        const definition = buildGeneralTabDefinition<unknown, AutomationCustomizationDraft>();
        const updateDraft = vi.fn();

        render(
            <>{definition.render({
                accentColor: '#f56500',
                clearError: () => {},
                commentsEnabled: true,
                draft,
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
                updateDraft
            })}</>
        );

        fireEvent.change(screen.getByLabelText('Sender email address'), {target: {value: 'team@example.com'}});
        fireEvent.change(screen.getByLabelText('Reply-to email'), {target: {value: 'reply@example.com'}});
        fireEvent.click(screen.getByLabelText('Publication title'));
        fireEvent.change(screen.getByLabelText('Email footer'), {target: {value: '<p>Footer</p>'}});

        expect(updateDraft).toHaveBeenCalledWith({sender_email: 'team@example.com'});
        expect(updateDraft).toHaveBeenCalledWith({sender_reply_to: 'reply@example.com'});
        expect(updateDraft).toHaveBeenCalledWith({show_header_title: true});
        expect(updateDraft).toHaveBeenCalledWith({footer_content: '<p>Footer</p>'});
    });
});
