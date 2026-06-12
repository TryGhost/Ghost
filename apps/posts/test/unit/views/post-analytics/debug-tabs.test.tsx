import DebugTabs, {DebugTabsProps} from '@src/views/PostAnalytics/Debug/debug-tabs';
import {MemoryRouter} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {getEmailSettings} from '@src/views/PostAnalytics/Debug/debug-data';

const baseProps: DebugTabsProps = {
    permanentFailures: [],
    temporaryFailures: [],
    batches: [],
    emailSettings: getEmailSettings(undefined),
    analyticsStatus: null,
    customSchedule: {show: false, begin: '', end: ''},
    onToggleCustomSchedule: vi.fn(),
    onCustomScheduleChange: vi.fn(),
    onScheduleAnalytics: vi.fn(),
    onCancelScheduledAnalytics: vi.fn()
};

const renderTabs = (props: Partial<DebugTabsProps> = {}) => {
    return render(
        <MemoryRouter>
            <DebugTabs {...baseProps} {...props} />
        </MemoryRouter>
    );
};

describe('DebugTabs', () => {
    it('renders all four tabs with counts', () => {
        renderTabs({
            permanentFailures: [
                {id: 'f1', code: 550, enhancedCode: null, message: 'Nope', failedAt: '', recipient: {name: 'A', email: 'a@x.com', initials: 'A'}, member: {name: 'A', email: 'a@x.com'}}
            ],
            batches: [
                {id: 'b1', status: 'Failed', statusClass: 'failed', createdAt: '', segment: '', providerId: null, errorMessage: '', errorStatusCode: '', recipientCount: 10},
                {id: 'b2', status: 'Submitted', statusClass: 'submitted', createdAt: '', segment: '', providerId: null, errorMessage: '', errorStatusCode: '', recipientCount: 20}
            ]
        });

        expect(screen.getByTestId('debug-tab-permanent-failures')).toHaveTextContent('Permanent failure');
        expect(screen.getByTestId('debug-tab-permanent-failures')).toHaveTextContent('1');
        expect(screen.getByTestId('debug-tab-temporary-failures')).toHaveTextContent('Temporary failures');
        expect(screen.getByTestId('debug-tab-temporary-failures')).toHaveTextContent('0');
        expect(screen.getByTestId('debug-tab-batches')).toHaveTextContent('Batch errored');
        expect(screen.getByTestId('debug-tab-batches')).toHaveTextContent('1');
        expect(screen.getByTestId('debug-tab-overview')).toHaveTextContent('Overview');
    });

    it('shows permanent failures with member details and failure codes', () => {
        renderTabs({
            permanentFailures: [{
                id: 'f1',
                code: 550,
                enhancedCode: '5.1.1',
                message: 'Mailbox does not exist',
                failedAt: '',
                recipient: {name: 'Jane Doe', email: 'jane@example.com', initials: 'JD'},
                member: {id: 'member-1', name: 'Jane Doe', email: 'jane@example.com'}
            }]
        });

        expect(screen.getAllByTestId('debug-permanent-failures-row')).toHaveLength(1);
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('550')).toBeInTheDocument();
        expect(screen.getByText('5.1.1')).toBeInTheDocument();
        expect(screen.getByText('Mailbox does not exist')).toBeInTheDocument();
        // Members with an id link to their member screen
        expect(screen.getByRole('link')).toHaveAttribute('href', '/members/member-1');
    });

    it('shows empty state messages when there is no failure data', () => {
        renderTabs();

        expect(screen.getByText('No permanent failures.')).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByTestId('debug-tab-temporary-failures'));
        expect(screen.getByText('No temporary failures.')).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByTestId('debug-tab-batches'));
        expect(screen.getByText('No batch data.')).toBeInTheDocument();
    });

    it('shows batch rows with error details', () => {
        renderTabs({
            batches: [{
                id: 'b1',
                status: 'Failed',
                statusClass: 'failed',
                createdAt: '05 Mar, 2024, 14:07:09',
                segment: 'status:free',
                providerId: 'provider-123',
                errorMessage: 'Mailgun exploded',
                errorStatusCode: 500,
                recipientCount: 321
            }]
        });

        fireEvent.mouseDown(screen.getByTestId('debug-tab-batches'));

        const row = screen.getByTestId('debug-batches-row');
        expect(row).toHaveTextContent('Failed');
        expect(row).toHaveTextContent('05 Mar, 2024, 14:07:09');
        expect(row).toHaveTextContent('status:free');
        expect(row).toHaveTextContent('321');
        expect(row).toHaveTextContent('provider-123');
        expect(row).toHaveTextContent('500');
        expect(row).toHaveTextContent('Mailgun exploded');
    });

    it('shows email settings and analytics status in the overview tab', () => {
        renderTabs({
            emailSettings: {
                statusClass: 'submitted',
                status: 'Submitted',
                recipientFilter: 'status:-free',
                createdAt: '05 Mar, 2024, 14:07:09',
                submittedAt: '05 Mar, 2024, 14:08:09',
                emailsSent: 1234,
                emailsDelivered: 1200,
                emailsOpened: 600,
                emailsFailed: 34,
                trackOpens: true,
                trackClicks: true,
                feedbackEnabled: false
            },
            analyticsStatus: {
                latest: {running: true, canceled: false, lastStarted: '05 Mar, 2024, 14:07:09.042', lastBegin: 'N/A', lastEventTimestamp: 'N/A', schedule: null},
                missing: {running: false, canceled: false, lastStarted: 'N/A', lastBegin: 'N/A', lastEventTimestamp: 'N/A', schedule: null},
                scheduled: {running: false, canceled: false, lastStarted: 'N/A', lastBegin: 'N/A', lastEventTimestamp: 'N/A', schedule: null}
            }
        });

        fireEvent.mouseDown(screen.getByTestId('debug-tab-overview'));

        const overview = screen.getByTestId('debug-overview');
        expect(overview).toHaveTextContent('Submitted');
        expect(overview).toHaveTextContent('status:-free');
        expect(overview).toHaveTextContent('1,234');
        expect(overview).toHaveTextContent('1,200');
        expect(overview).toHaveTextContent('600');
        expect(overview).toHaveTextContent('34');
        expect(overview).toHaveTextContent('05 Mar, 2024, 14:07:09.042');
        // No scheduled refetch -> offers the refetch buttons
        expect(screen.getByRole('button', {name: 'Refetch Analytics'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Custom Date Range'})).toBeInTheDocument();
    });

    it('shows the custom schedule inputs when enabled and forwards changes', () => {
        const onCustomScheduleChange = vi.fn();
        const onScheduleAnalytics = vi.fn();
        renderTabs({
            customSchedule: {show: true, begin: '2024-03-05T14:07', end: '2024-03-06T11:00'},
            onCustomScheduleChange,
            onScheduleAnalytics
        });

        fireEvent.mouseDown(screen.getByTestId('debug-tab-overview'));

        expect(screen.getByLabelText('Begin:')).toHaveValue('2024-03-05T14:07');
        expect(screen.getByLabelText('End:')).toHaveValue('2024-03-06T11:00');

        fireEvent.change(screen.getByLabelText('Begin:'), {target: {value: '2024-03-05T15:00'}});
        expect(onCustomScheduleChange).toHaveBeenCalledWith({begin: '2024-03-05T15:00'});

        fireEvent.click(screen.getByRole('button', {name: 'Schedule Custom Refetch'}));
        expect(onScheduleAnalytics).toHaveBeenCalled();
    });

    it('shows the scheduled refetch details and cancel button when a schedule exists', () => {
        const onCancelScheduledAnalytics = vi.fn();
        renderTabs({
            analyticsStatus: {
                latest: {running: false, canceled: false, lastStarted: 'N/A', lastBegin: 'N/A', lastEventTimestamp: 'N/A', schedule: null},
                missing: {running: false, canceled: false, lastStarted: 'N/A', lastBegin: 'N/A', lastEventTimestamp: 'N/A', schedule: null},
                scheduled: {
                    running: true,
                    canceled: false,
                    lastStarted: '05 Mar, 2024, 14:07:09.042',
                    lastBegin: 'N/A',
                    lastEventTimestamp: 'N/A',
                    schedule: {begin: '05 Mar, 2024, 10:00:00.000', end: '05 Mar, 2024, 12:00:00.000'}
                }
            },
            onCancelScheduledAnalytics
        });

        fireEvent.mouseDown(screen.getByTestId('debug-tab-overview'));

        expect(screen.getByText('05 Mar, 2024, 10:00:00.000 - 05 Mar, 2024, 12:00:00.000')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Cancel scheduled refetch'}));
        expect(onCancelScheduledAnalytics).toHaveBeenCalled();
    });
});
