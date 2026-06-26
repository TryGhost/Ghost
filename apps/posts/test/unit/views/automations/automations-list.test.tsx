import AutomationsList from '@src/views/Automations/components/automations-list';
import React from 'react';
import {MemoryRouter} from 'react-router';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';

const automations = [{
    id: 'automation-id-1',
    name: 'Free member welcome flow',
    slug: 'member-welcome-email-free',
    status: 'active' as const
}, {
    id: 'automation-id-2',
    name: 'Paid member welcome flow',
    slug: 'member-welcome-email-paid',
    status: 'inactive' as const
}];

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AutomationsList', () => {
    it('renders fetched automations with private beta copy and status labels', () => {
        renderWithRouter(<AutomationsList automations={automations} />);

        expect(screen.getAllByTestId('automation-list-row')).toHaveLength(2);
        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Welcome new free members after they sign up.')).toBeInTheDocument();
        expect(screen.getByText('Paid member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Welcome new paid members after they start their subscription.')).toBeInTheDocument();
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('links each row to the automation sequence by id', () => {
        renderWithRouter(<AutomationsList automations={automations} />);

        expect(screen.getByRole('link', {name: 'Free member welcome flow'})).toHaveAttribute('href', '/automations/automation-id-1');
        expect(screen.getByRole('link', {name: 'Paid member welcome flow'})).toHaveAttribute('href', '/automations/automation-id-2');
    });

    it('renders a table skeleton while loading', () => {
        renderWithRouter(<AutomationsList isLoading={true} />);

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });
});
