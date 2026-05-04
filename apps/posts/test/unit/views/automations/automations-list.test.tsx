import AutomationsList from '@src/views/Automations/components/automations-list';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';

const automations = [{
    id: 'automation-id-1',
    name: 'Welcome Email (Free)',
    slug: 'member-welcome-email-free',
    status: 'active' as const
}, {
    id: 'automation-id-2',
    name: 'Welcome Email (Paid)',
    slug: 'member-welcome-email-paid',
    status: 'inactive' as const
}];

describe('AutomationsList', () => {
    it('renders fetched automations with private beta copy and status labels', () => {
        render(<AutomationsList automations={automations} />);

        expect(screen.getByRole('columnheader', {name: 'Automation'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Status'})).toBeInTheDocument();
        expect(screen.getByText('Welcome Email (Free)')).toBeInTheDocument();
        expect(screen.getByText('Onboard new free members with a short welcome email.')).toBeInTheDocument();
        expect(screen.getByText('Welcome Email (Paid)')).toBeInTheDocument();
        expect(screen.getByText('Greet new paid members and point them at member-only content.')).toBeInTheDocument();
        expect(screen.getByText('LIVE')).toBeInTheDocument();
        expect(screen.getByText('OFF')).toBeInTheDocument();
    });

    it('links each row to the automation sequence slug', () => {
        render(<AutomationsList automations={automations} />);

        expect(screen.getByRole('link', {name: 'Welcome Email (Free)'})).toHaveAttribute('href', '#/automations/member-welcome-email-free');
        expect(screen.getByRole('link', {name: 'Welcome Email (Paid)'})).toHaveAttribute('href', '#/automations/member-welcome-email-paid');
    });

    it('renders a table skeleton while loading', () => {
        render(<AutomationsList isLoading={true} />);

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });
});
