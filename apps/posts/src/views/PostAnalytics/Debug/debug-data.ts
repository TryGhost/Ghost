import {Email, EmailAnalyticsFetchStatus, EmailAnalyticsStatusResponseType, EmailBatch, EmailRecipientFailure} from '@tryghost/admin-x-framework/api/emails';

// Pure data mapping for the post email debug screen. Mirrors the computed
// properties of the legacy Ember component (ghost/admin/app/components/posts/debug.js).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(value: number, length = 2): string {
    return String(value).padStart(length, '0');
}

// Formats a timestamp like the Ember screen did via moment:
// 'DD MMM, YYYY, HH:mm:ss' (optionally with milliseconds), in local time.
export function formatTimestamp(value?: string | null, {milliseconds = false}: {milliseconds?: boolean} = {}): string {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return '';
    }
    let formatted = `${pad(date.getDate())} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    if (milliseconds) {
        formatted += `.${pad(date.getMilliseconds(), 3)}`;
    }
    return formatted;
}

export function getStatusLabel(status?: string | null): string {
    switch (status) {
    case 'submitted':
        return 'Submitted';
    case 'submitting':
        return 'Submitting';
    case 'pending':
        return 'Pending';
    case 'failed':
        return 'Failed';
    default:
        return status || '';
    }
}

export function getInitials(name?: string | null): string {
    if (!name) {
        return 'U';
    }
    const names = name.split(' ');
    const initials = names.length > 1 ? [names[0][0], names[names.length - 1][0]] : [names[0][0]];
    return initials.join('').toUpperCase();
}

export interface BatchRow {
    id: string;
    status: string;
    statusClass: string;
    createdAt: string;
    segment: string;
    providerId: string | null;
    errorMessage: string;
    errorStatusCode: number | '';
    recipientCount: number;
}

export function mapEmailBatches(batches?: EmailBatch[] | null): BatchRow[] {
    return (batches || []).map(batch => ({
        id: batch.id,
        status: getStatusLabel(batch.status),
        statusClass: batch.status || '',
        createdAt: formatTimestamp(batch.created_at),
        segment: batch.member_segment || '',
        providerId: batch.provider_id || null,
        errorMessage: batch.error_message || '',
        errorStatusCode: batch.error_status_code || '',
        recipientCount: batch.count?.recipients || 0
    }));
}

export interface FailureRow {
    id: string;
    code?: number;
    enhancedCode: string | null;
    message: string;
    failedAt: string;
    batchId?: string;
    recipient: {
        name: string;
        email: string;
        initials: string;
    };
    member: {
        id?: string;
        name: string;
        email: string;
    };
}

export function mapRecipientFailures(failures: EmailRecipientFailure[] | undefined | null, severity: 'temporary' | 'permanent'): FailureRow[] {
    return (failures || []).filter(failure => failure.severity === severity).map(failure => ({
        id: failure.id,
        code: failure.code,
        enhancedCode: failure.enhanced_code || null,
        message: failure.message || '',
        failedAt: formatTimestamp(failure.failed_at),
        batchId: failure.email_recipient?.batch_id,
        recipient: {
            name: failure.email_recipient?.member_name || '',
            email: failure.email_recipient?.member_email || '',
            initials: getInitials(failure.email_recipient?.member_name || failure.email_recipient?.member_email)
        },
        member: {
            id: failure.member?.id,
            name: failure.member?.name || '',
            email: failure.member?.email || ''
        }
    }));
}

export interface EmailSettingsData {
    statusClass: string;
    status: string;
    recipientFilter: string;
    createdAt: string;
    submittedAt: string;
    emailsSent: number;
    emailsDelivered: number;
    emailsOpened: number;
    emailsFailed: number;
    trackOpens: boolean;
    trackClicks: boolean;
    feedbackEnabled: boolean;
}

export function getEmailSettings(email?: Email | null): EmailSettingsData {
    return {
        statusClass: email?.status || '',
        status: getStatusLabel(email?.status),
        recipientFilter: email?.recipient_filter || '',
        createdAt: formatTimestamp(email?.created_at),
        submittedAt: formatTimestamp(email?.submitted_at),
        emailsSent: email?.email_count || 0,
        emailsDelivered: email?.delivered_count || 0,
        emailsOpened: email?.opened_count || 0,
        emailsFailed: email?.failed_count || 0,
        trackOpens: Boolean(email?.track_opens),
        trackClicks: Boolean(email?.track_clicks),
        feedbackEnabled: Boolean(email?.feedback_enabled)
    };
}

export interface AnalyticsFetchStatusData {
    running: boolean;
    canceled: boolean;
    lastStarted: string;
    lastBegin: string;
    lastEventTimestamp: string;
    schedule: {begin: string; end: string} | null;
}

function mapFetchStatus(status?: EmailAnalyticsFetchStatus | null): AnalyticsFetchStatusData {
    return {
        running: Boolean(status?.running),
        canceled: Boolean(status?.canceled),
        lastStarted: formatTimestamp(status?.lastStarted, {milliseconds: true}) || 'N/A',
        lastBegin: formatTimestamp(status?.lastBegin, {milliseconds: true}) || 'N/A',
        lastEventTimestamp: formatTimestamp(status?.lastEventTimestamp, {milliseconds: true}) || 'N/A',
        schedule: status?.schedule ? {
            begin: formatTimestamp(status.schedule.begin, {milliseconds: true}) || 'N/A',
            end: formatTimestamp(status.schedule.end, {milliseconds: true}) || 'N/A'
        } : null
    };
}

export interface AnalyticsStatusData {
    latest: AnalyticsFetchStatusData;
    missing: AnalyticsFetchStatusData;
    scheduled: AnalyticsFetchStatusData;
}

export function mapAnalyticsStatus(status?: EmailAnalyticsStatusResponseType | null): AnalyticsStatusData | null {
    if (!status) {
        return null;
    }
    return {
        latest: mapFetchStatus(status.latest),
        missing: mapFetchStatus(status.missing),
        scheduled: mapFetchStatus(status.scheduled)
    };
}

// Default custom schedule range, mirroring the Ember component: begins at the
// email's created_at, ends at min(now - 1h, created_at + 7 days), formatted
// for a datetime-local input.
export function getDefaultCustomScheduleRange(emailCreatedAt?: string | null, now: Date = new Date()): {begin: string; end: string} {
    const createdAt = emailCreatedAt ? new Date(emailCreatedAt) : now;
    const maxEnd = new Date(Math.min(now.getTime() - 60 * 60 * 1000, createdAt.getTime() + 7 * 24 * 60 * 60 * 1000));

    const toInputValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

    return {
        begin: toInputValue(createdAt),
        end: toInputValue(maxEnd)
    };
}
