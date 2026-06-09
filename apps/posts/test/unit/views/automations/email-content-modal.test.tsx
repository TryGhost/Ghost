import EmailContentModal from '@src/views/Automations/components/email-modal/email-content-modal';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';

const NON_EMPTY_EMAIL_LEXICAL = '{"root":{"children":[{"type":"paragraph","children":[{"type":"text","text":"Welcome email body"}]}]}}';

const {mockPreviewWelcomeEmail, mockUseBrowseAutomatedEmails} = vi.hoisted(() => ({
    mockPreviewWelcomeEmail: vi.fn(),
    mockUseBrowseAutomatedEmails: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/automated-emails', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/automated-emails')>(
        '@tryghost/admin-x-framework/api/automated-emails'
    );
    return {
        ...actual,
        useBrowseAutomatedEmails: () => mockUseBrowseAutomatedEmails(),
        usePreviewWelcomeEmail: () => ({
            mutateAsync: mockPreviewWelcomeEmail
        })
    };
});

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>(
        '@tryghost/admin-x-framework/hooks'
    );
    return {
        ...actual,
        useHandleError: () => vi.fn()
    };
});

vi.mock('@src/views/Automations/components/email-modal/email-editor', () => ({
    default: ({value}: {value: string}) => (
        <textarea data-testid='email-editor-mock' value={value} readOnly />
    )
}));

vi.mock('@src/views/Automations/components/email-modal/use-sender-details', () => ({
    useEmailSenderDetails: () => ({
        hasDistinctReplyTo: false,
        resolvedReplyToEmail: 'reply@example.com',
        resolvedSenderEmail: 'sender@example.com',
        resolvedSenderName: 'Sender'
    })
}));

describe('EmailContentModal', () => {
    beforeEach(() => {
        mockPreviewWelcomeEmail.mockReset();
        mockUseBrowseAutomatedEmails.mockReset();
        mockPreviewWelcomeEmail.mockResolvedValue({
            automated_emails: [{
                html: '<html><body>Preview</body></html>',
                plaintext: 'Preview',
                subject: 'Welcome!'
            }]
        });
    });

    it('waits for an automated email id before rendering the initial preview', async () => {
        mockUseBrowseAutomatedEmails.mockReturnValue({data: undefined, isLoading: true});

        const renderModal = () => (
            <EmailContentModal
                initialLexical={NON_EMPTY_EMAIL_LEXICAL}
                initialMode='preview'
                initialSubject='Welcome!'
                onClose={vi.fn()}
                onSave={vi.fn()}
            />
        );

        const {rerender} = render(renderModal());

        expect(mockPreviewWelcomeEmail).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Test'})).toBeDisabled();

        mockUseBrowseAutomatedEmails.mockReturnValue({
            isLoading: false,
            data: {
                automated_emails: [{
                    id: 'automated-email-id',
                    slug: 'member-welcome-email-free'
                }]
            }
        });
        rerender(renderModal());

        expect(screen.getByRole('button', {name: 'Test'})).toBeEnabled();

        await waitFor(() => {
            expect(mockPreviewWelcomeEmail).toHaveBeenCalledWith({
                id: 'automated-email-id',
                lexical: NON_EMPTY_EMAIL_LEXICAL,
                subject: 'Welcome!'
            });
        });
        expect(mockPreviewWelcomeEmail).not.toHaveBeenCalledWith(expect.objectContaining({id: ''}));
    });

    it('surfaces an error instead of spinning forever when no automated email id resolves', async () => {
        // The borrow query settled with no automated emails, so the id will never arrive.
        mockUseBrowseAutomatedEmails.mockReturnValue({data: {automated_emails: []}, isLoading: false});

        render(
            <EmailContentModal
                initialLexical={NON_EMPTY_EMAIL_LEXICAL}
                initialMode='preview'
                initialSubject='Welcome!'
                onClose={vi.fn()}
                onSave={vi.fn()}
            />
        );

        expect(await screen.findByTestId('email-preview-error')).toBeInTheDocument();
        expect(screen.queryByTestId('email-preview-loading')).not.toBeInTheDocument();
        expect(mockPreviewWelcomeEmail).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Test'})).toBeDisabled();
    });
});
