import WebhooksTable from '@src/components/settings/advanced/integrations/webhooks-table';
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

        const {container} = render(<WebhooksTable integration={integration} />);

        expect(screen.getByRole('heading', {name: 'No webhooks'})).toBeInTheDocument();
        expect(screen.getByText('Add a webhook to send Ghost events to another service.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Add webhook'})).toHaveClass('border-control-border');
        const separators = container.querySelectorAll('[data-orientation="horizontal"]');

        expect(separators).toHaveLength(2);
        expect(separators[1]).toHaveClass('relative', 'z-[300]');
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
