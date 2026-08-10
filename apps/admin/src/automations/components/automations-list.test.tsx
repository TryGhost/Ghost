import AutomationsList from './automations-list';
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

const analytics = [{
    automation_id: 'automation-id-1',
    total_runs: 1432,
    in_progress: 118,
    completed: 1225,
    last_run_at: '2026-07-21T07:12:00Z'
}, {
    automation_id: 'automation-id-2',
    total_runs: 412,
    in_progress: 61,
    completed: 320,
    last_run_at: '2026-07-21T05:55:00Z'
}];

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AutomationsList', () => {
    it('renders fetched automations with private beta copy and status labels', () => {
        renderWithRouter(<AutomationsList analytics={analytics} automations={automations} showRunAnalytics={true} />);

        expect(screen.getAllByTestId('automation-list-row')).toHaveLength(2);
        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Welcome new free members after they sign up.')).toBeInTheDocument();
        expect(screen.getByText('Paid member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Welcome new paid members after they start their subscription.')).toBeInTheDocument();
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.getByText('Off')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Last run'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'In progress'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Completed'})).toBeInTheDocument();
        expect(screen.getByText('118')).toBeInTheDocument();
        expect(screen.getByText('1,225')).toBeInTheDocument();
        expect(screen.getByText('61')).toBeInTheDocument();
        expect(screen.getByText('320')).toBeInTheDocument();
    });

    it('keeps run analytics columns hidden when the feature is disabled', () => {
        renderWithRouter(<AutomationsList analytics={analytics} automations={automations} showRunAnalytics={false} />);

        expect(screen.queryByRole('columnheader', {name: 'Last run'})).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', {name: 'In progress'})).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', {name: 'Completed'})).not.toBeInTheDocument();
        expect(screen.queryByText('1,225')).not.toBeInTheDocument();
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
