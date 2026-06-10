import {describe, expect, it} from 'vitest';
import {
    formatTimestamp,
    getDefaultCustomScheduleRange,
    getEmailSettings,
    getInitials,
    getStatusLabel,
    mapAnalyticsStatus,
    mapEmailBatches,
    mapRecipientFailures
} from '@src/views/PostAnalytics/Debug/debug-data';
import type {EmailBatch, EmailRecipientFailure} from '@tryghost/admin-x-framework/api/emails';

describe('debug-data', () => {
    describe('getStatusLabel', () => {
        it('maps known statuses to labels', () => {
            expect(getStatusLabel('submitted')).toBe('Submitted');
            expect(getStatusLabel('submitting')).toBe('Submitting');
            expect(getStatusLabel('pending')).toBe('Pending');
            expect(getStatusLabel('failed')).toBe('Failed');
        });

        it('passes through unknown statuses and handles missing values', () => {
            expect(getStatusLabel('something-else')).toBe('something-else');
            expect(getStatusLabel(undefined)).toBe('');
        });
    });

    describe('getInitials', () => {
        it('uses first and last name initials', () => {
            expect(getInitials('Jane Maria Doe')).toBe('JD');
        });

        it('uses a single initial for single names', () => {
            expect(getInitials('jane@example.com')).toBe('J');
        });

        it('defaults to U when there is no name', () => {
            expect(getInitials(null)).toBe('U');
            expect(getInitials('')).toBe('U');
        });
    });

    describe('formatTimestamp', () => {
        it('formats ISO timestamps', () => {
            // Use a local-time ISO string so the expectation is timezone-independent
            expect(formatTimestamp('2024-03-05T14:07:09')).toBe('05 Mar, 2024, 14:07:09');
        });

        it('appends milliseconds when requested', () => {
            expect(formatTimestamp('2024-03-05T14:07:09.042', {milliseconds: true})).toBe('05 Mar, 2024, 14:07:09.042');
        });

        it('returns an empty string for missing or invalid values', () => {
            expect(formatTimestamp(null)).toBe('');
            expect(formatTimestamp('not-a-date')).toBe('');
        });
    });

    describe('mapEmailBatches', () => {
        const batches: EmailBatch[] = [{
            id: 'batch-1',
            status: 'failed',
            member_segment: 'status:free',
            provider_id: 'provider-123',
            error_status_code: 500,
            error_message: 'Mailgun exploded',
            created_at: '2024-03-05T14:07:09',
            count: {recipients: 321}
        }, {
            id: 'batch-2',
            status: 'submitted',
            member_segment: null,
            provider_id: null,
            error_status_code: null,
            error_message: null
        }];

        it('maps API batches to rows', () => {
            const rows = mapEmailBatches(batches);

            expect(rows).toHaveLength(2);
            expect(rows[0]).toEqual({
                id: 'batch-1',
                status: 'Failed',
                statusClass: 'failed',
                createdAt: '05 Mar, 2024, 14:07:09',
                segment: 'status:free',
                providerId: 'provider-123',
                errorMessage: 'Mailgun exploded',
                errorStatusCode: 500,
                recipientCount: 321
            });
            expect(rows[1]).toEqual({
                id: 'batch-2',
                status: 'Submitted',
                statusClass: 'submitted',
                createdAt: '',
                segment: '',
                providerId: null,
                errorMessage: '',
                errorStatusCode: '',
                recipientCount: 0
            });
        });

        it('handles missing data', () => {
            expect(mapEmailBatches(undefined)).toEqual([]);
        });
    });

    describe('mapRecipientFailures', () => {
        const failures: EmailRecipientFailure[] = [{
            id: 'failure-1',
            code: 550,
            enhanced_code: '5.1.1',
            message: 'Mailbox does not exist',
            severity: 'permanent',
            email_recipient: {
                batch_id: 'batch-1',
                member_name: 'Jane Doe',
                member_email: 'jane@example.com'
            },
            member: {id: 'member-1', name: 'Jane Doe', email: 'jane@example.com'}
        }, {
            id: 'failure-2',
            code: 421,
            enhanced_code: null,
            message: 'Try again later',
            severity: 'temporary',
            failed_at: '2024-03-05T14:07:09',
            email_recipient: {
                batch_id: 'batch-2',
                member_name: null,
                member_email: 'ghost@example.com'
            },
            member: null
        }];

        it('filters by severity and maps recipient/member details', () => {
            const permanent = mapRecipientFailures(failures, 'permanent');

            expect(permanent).toHaveLength(1);
            expect(permanent[0]).toMatchObject({
                id: 'failure-1',
                code: 550,
                enhancedCode: '5.1.1',
                message: 'Mailbox does not exist',
                batchId: 'batch-1',
                recipient: {name: 'Jane Doe', email: 'jane@example.com', initials: 'JD'},
                member: {id: 'member-1', name: 'Jane Doe', email: 'jane@example.com'}
            });
        });

        it('falls back to the recipient email for initials and handles missing members', () => {
            const temporary = mapRecipientFailures(failures, 'temporary');

            expect(temporary).toHaveLength(1);
            expect(temporary[0]).toMatchObject({
                id: 'failure-2',
                failedAt: '05 Mar, 2024, 14:07:09',
                recipient: {name: '', email: 'ghost@example.com', initials: 'G'},
                member: {id: undefined, name: '', email: ''}
            });
        });

        it('handles missing data', () => {
            expect(mapRecipientFailures(undefined, 'permanent')).toEqual([]);
        });
    });

    describe('getEmailSettings', () => {
        it('maps the email resource', () => {
            const settings = getEmailSettings({
                id: 'email-1',
                status: 'submitted',
                recipient_filter: 'status:-free',
                created_at: '2024-03-05T14:07:09',
                submitted_at: '2024-03-05T14:08:09',
                email_count: 100,
                delivered_count: 90,
                opened_count: 40,
                failed_count: 10,
                track_opens: true,
                track_clicks: false,
                feedback_enabled: true
            });

            expect(settings).toEqual({
                statusClass: 'submitted',
                status: 'Submitted',
                recipientFilter: 'status:-free',
                createdAt: '05 Mar, 2024, 14:07:09',
                submittedAt: '05 Mar, 2024, 14:08:09',
                emailsSent: 100,
                emailsDelivered: 90,
                emailsOpened: 40,
                emailsFailed: 10,
                trackOpens: true,
                trackClicks: false,
                feedbackEnabled: true
            });
        });

        it('renders empty defaults without an email', () => {
            expect(getEmailSettings(undefined)).toEqual({
                statusClass: '',
                status: '',
                recipientFilter: '',
                createdAt: '',
                submittedAt: '',
                emailsSent: 0,
                emailsDelivered: 0,
                emailsOpened: 0,
                emailsFailed: 0,
                trackOpens: false,
                trackClicks: false,
                feedbackEnabled: false
            });
        });
    });

    describe('mapAnalyticsStatus', () => {
        it('returns null without data', () => {
            expect(mapAnalyticsStatus(undefined)).toBeNull();
        });

        it('maps each fetch status with N/A defaults', () => {
            const mapped = mapAnalyticsStatus({
                latest: {
                    running: true,
                    lastStarted: '2024-03-05T14:07:09.042',
                    lastBegin: '2024-03-05T13:07:09.001'
                },
                missing: null,
                scheduled: {
                    running: false,
                    canceled: false,
                    schedule: {begin: '2024-03-05T10:00:00.000', end: '2024-03-05T12:00:00.000'}
                }
            });

            expect(mapped?.latest).toEqual({
                running: true,
                canceled: false,
                lastStarted: '05 Mar, 2024, 14:07:09.042',
                lastBegin: '05 Mar, 2024, 13:07:09.001',
                lastEventTimestamp: 'N/A',
                schedule: null
            });
            expect(mapped?.missing).toEqual({
                running: false,
                canceled: false,
                lastStarted: 'N/A',
                lastBegin: 'N/A',
                lastEventTimestamp: 'N/A',
                schedule: null
            });
            expect(mapped?.scheduled.schedule).toEqual({
                begin: '05 Mar, 2024, 10:00:00.000',
                end: '05 Mar, 2024, 12:00:00.000'
            });
        });
    });

    describe('getDefaultCustomScheduleRange', () => {
        it('begins at the email created_at and ends at now minus one hour when that is sooner', () => {
            const now = new Date('2024-03-06T12:00:00');
            const range = getDefaultCustomScheduleRange('2024-03-05T14:07:09', now);

            expect(range.begin).toBe('2024-03-05T14:07');
            expect(range.end).toBe('2024-03-06T11:00');
        });

        it('caps the end at created_at plus seven days', () => {
            const now = new Date('2024-04-01T12:00:00');
            const range = getDefaultCustomScheduleRange('2024-03-05T14:07:09', now);

            expect(range.end).toBe('2024-03-12T14:07');
        });
    });
});
