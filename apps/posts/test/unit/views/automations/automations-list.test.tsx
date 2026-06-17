import AutomationsList from '@src/views/Automations/components/automations-list';
import React from 'react';
import {MemoryRouter} from 'react-router';
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

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AutomationsList', () => {
    it('renders fetched automations with private beta copy and status labels', () => {
        renderWithRouter(<AutomationsList automations={automations} />);

        expect(screen.getAllByTestId('automation-list-row')).toHaveLength(2);
        expect(screen.getByText('Welcome Email (Free)')).toBeInTheDocument();
        expect(screen.getByText('Onboard new free members with a short welcome email.')).toBeInTheDocument();
        expect(screen.getByText('Welcome Email (Paid)')).toBeInTheDocument();
        expect(screen.getByText('Greet new paid members and point them at member-only content.')).toBeInTheDocument();
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('renders Name, In progress, Completed, Created and Status columns', () => {
        renderWithRouter(<AutomationsList automations={automations} />);

        expect(screen.getByRole('columnheader', {name: 'Name'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'In progress'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Completed'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Created'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Status'})).toBeInTheDocument();

        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('1,247')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('842')).toBeInTheDocument();
        expect(screen.getByText('3 days ago')).toBeInTheDocument();
        expect(screen.getByText('12 Feb 2026')).toBeInTheDocument();
    });

    it('links each row to the automation sequence by id', () => {
        renderWithRouter(<AutomationsList automations={automations} />);

        expect(screen.getByRole('link', {name: 'Welcome Email (Free)'})).toHaveAttribute('href', '/automations/automation-id-1');
        expect(screen.getByRole('link', {name: 'Welcome Email (Paid)'})).toHaveAttribute('href', '/automations/automation-id-2');
    });

    it('renders a table skeleton while loading', () => {
        renderWithRouter(<AutomationsList isLoading={true} />);

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });
});
