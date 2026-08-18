import WebhooksTable from '@/settings/app/components/settings/advanced/integrations/webhooks-table';
import {ConfirmationProvider} from '@/settings/app/components/providers/confirmation-provider';
import {type Integration} from '@tryghost/admin-x-framework/api/integrations';
import {render, screen} from '@testing-library/react';

vi.mock('@tryghost/admin-x-framework/api/webhooks', () => ({
    useDeleteWebhook: () => ({mutateAsync: vi.fn()})
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
    useHandleError: () => vi.fn()
}));

describe('WebhooksTable', () => {
    it('shows the standard empty state when an integration has no webhooks', () => {
        const integration = {
            id: 'integration-id',
            webhooks: []
        } as unknown as Integration;

        const {container} = render(<ConfirmationProvider><WebhooksTable integration={integration} /></ConfirmationProvider>);

        expect(screen.getByRole('heading', {name: 'No webhooks'})).toBeInTheDocument();
        expect(screen.getByText('Add a webhook to send Ghost events to another service.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Add webhook'})).toHaveClass('border-control-border');
        const separators = container.querySelectorAll('[data-orientation="horizontal"]');

        expect(separators).toHaveLength(2);
        expect(container.querySelector('[class*="z-[300]"]')).not.toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('keeps the add action and bottom separator inside a populated webhook section', () => {
        const integration = {
            id: 'integration-id',
            webhooks: [{
                id: 'webhook-id',
                name: 'Webhook name',
                event: 'post.edited',
                target_url: 'https://example.com/webhook'
            }]
        } as unknown as Integration;

        const {container} = render(<ConfirmationProvider><WebhooksTable integration={integration} /></ConfirmationProvider>);

        const table = screen.getByRole('table');
        const addButton = screen.getByRole('button', {name: 'Add webhook'});
        const separator = container.querySelector('[data-orientation="horizontal"]')!;

        expect(table.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(addButton.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(separator).toBeInTheDocument();
    });
});
