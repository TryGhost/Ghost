import AutomationsList from './automations-list';
import React from 'react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

const automations = [{
    id: 'automation-id-1',
    name: 'Free member welcome flow',
    slug: 'member-welcome-email-free',
    status: 'active' as const,
    stats: {
        last_run_created_at: '2026-07-21T07:12:00.000Z',
        total_run_count: 1432,
        in_progress_run_count: 118
    }
}, {
    id: 'automation-id-2',
    name: 'Paid member welcome flow',
    slug: 'member-welcome-email-paid',
    status: 'inactive' as const,
    stats: {
        last_run_created_at: null,
        total_run_count: 0,
        in_progress_run_count: 0
    }
}];

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AutomationsList', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-04T07:12:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders fetched automations with private beta copy and status labels', () => {
        renderWithRouter(<AutomationsList automations={automations} showRunAnalytics={true} />);

        expect(screen.getAllByTestId('automation-list-row')).toHaveLength(2);
        expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Welcome new free members after they sign up.')).toBeInTheDocument();
        expect(screen.getByText('Paid member welcome flow')).toBeInTheDocument();
        expect(screen.getByText('Welcome new paid members after they start their subscription.')).toBeInTheDocument();
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.getByText('Off')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Last entry'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'Total entries'})).toBeInTheDocument();
        expect(screen.getByRole('columnheader', {name: 'In progress'})).toBeInTheDocument();
        expect(screen.getByText('1,432')).toBeInTheDocument();
        expect(screen.getByText('118')).toBeInTheDocument();
        expect(screen.getByText('14 days ago')).toHaveAttribute('datetime', '2026-07-21T07:12:00.000Z');
    });

    it('renders Never when an automation has no last entry', () => {
        renderWithRouter(<AutomationsList automations={[automations[1]]} showRunAnalytics={true} />);

        expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('hides run analytics when the feature is disabled', () => {
        renderWithRouter(<AutomationsList automations={automations} showRunAnalytics={false} />);

        expect(screen.queryByRole('columnheader', {name: 'Last entry'})).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', {name: 'Total entries'})).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', {name: 'In progress'})).not.toBeInTheDocument();
        expect(screen.queryByText('1,432')).not.toBeInTheDocument();
    });

    it('links each row to the automation sequence by id', () => {
        renderWithRouter(<AutomationsList automations={automations} />);

        expect(screen.getByRole('table', {name: 'Automations'})).toBeInTheDocument();
        expect(screen.getAllByRole('rowheader')).toHaveLength(2);
        expect(screen.getByRole('link', {name: 'Free member welcome flow'})).toHaveAttribute('href', '/automations/automation-id-1');
        expect(screen.getByRole('link', {name: 'Paid member welcome flow'})).toHaveAttribute('href', '/automations/automation-id-2');
    });

    it('renders a table skeleton while loading', () => {
        renderWithRouter(<AutomationsList isLoading={true} showRunAnalytics={true} />);

        expect(screen.getByTestId('automations-list-loading')).toBeInTheDocument();
    });
});
