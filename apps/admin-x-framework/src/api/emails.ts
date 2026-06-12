import {Meta, createMutation, createQueryWithId} from '../utils/api/hooks';

// The email resource as returned by the Admin API /emails/ endpoints
export type Email = {
    id: string;
    uuid?: string;
    status?: string;
    recipient_filter?: string;
    error?: string | null;
    email_count?: number;
    delivered_count?: number;
    opened_count?: number;
    failed_count?: number;
    subject?: string;
    track_opens?: boolean;
    track_clicks?: boolean;
    feedback_enabled?: boolean;
    created_at?: string;
    submitted_at?: string;
};

export interface EmailsResponseType {
    meta?: Meta;
    emails: Email[];
}

export type EmailBatch = {
    id: string;
    status?: string;
    member_segment?: string | null;
    provider_id?: string | null;
    error_status_code?: number | null;
    error_message?: string | null;
    created_at?: string;
    updated_at?: string;
    count?: {
        recipients?: number;
    };
};

export interface EmailBatchesResponseType {
    meta?: Meta;
    batches: EmailBatch[];
}

export type EmailRecipientFailure = {
    id: string;
    code?: number;
    enhanced_code?: string | null;
    message?: string;
    severity?: 'temporary' | 'permanent';
    failed_at?: string | null;
    email_recipient?: {
        id?: string;
        batch_id?: string;
        member_name?: string | null;
        member_email?: string | null;
        processed_at?: string | null;
    };
    member?: {
        id?: string;
        name?: string | null;
        email?: string | null;
    } | null;
};

export interface EmailRecipientFailuresResponseType {
    meta?: Meta;
    failures: EmailRecipientFailure[];
}

// Status of one of the email analytics fetch jobs (latest/missing/scheduled)
export type EmailAnalyticsFetchStatus = {
    running?: boolean;
    canceled?: boolean;
    lastStarted?: string;
    lastBegin?: string;
    lastEventTimestamp?: string;
    schedule?: {
        begin?: string;
        end?: string;
    };
};

export type EmailAnalyticsStatusResponseType = {
    latest?: EmailAnalyticsFetchStatus | null;
    missing?: EmailAnalyticsFetchStatus | null;
    scheduled?: EmailAnalyticsFetchStatus | null;
    latestOpened?: EmailAnalyticsFetchStatus | null;
};

export const getEmail = createQueryWithId<EmailsResponseType>({
    dataType: 'EmailsResponseType',
    path: id => `/emails/${id}/`
});

export const getEmailBatches = createQueryWithId<EmailBatchesResponseType>({
    dataType: 'EmailBatchesResponseType',
    path: id => `/emails/${id}/batches/`,
    defaultSearchParams: {
        include: 'count.recipients',
        limit: 'all',
        order: 'status asc, created_at desc'
    }
});

export const getEmailRecipientFailures = createQueryWithId<EmailRecipientFailuresResponseType>({
    dataType: 'EmailRecipientFailuresResponseType',
    path: id => `/emails/${id}/recipient-failures/`,
    defaultSearchParams: {
        include: 'member,email_recipient',
        limit: 'all'
    }
});

export const getEmailAnalyticsStatus = createQueryWithId<EmailAnalyticsStatusResponseType>({
    dataType: 'EmailAnalyticsStatusResponseType',
    path: id => `/emails/${id}/analytics/`
});

// Schedules a (re)fetch of email analytics events. `begin`/`end` are ISO
// timestamps limiting the refetch window; when omitted the API derives them
// from the email's created_at.
export const useScheduleEmailAnalytics = createMutation<unknown, {id: string; begin?: string; end?: string}>({
    method: 'PUT',
    path: ({id}) => `/emails/${id}/analytics/`,
    searchParams: ({begin, end}) => {
        const params: Record<string, string> = {};
        if (begin) {
            params.begin = begin;
        }
        if (end) {
            params.end = end;
        }
        return params;
    },
    body: () => ({}),
    invalidateQueries: {dataType: 'EmailAnalyticsStatusResponseType'}
});

export const useCancelScheduledEmailAnalytics = createMutation<unknown, void>({
    method: 'DELETE',
    path: () => '/emails/analytics/',
    invalidateQueries: {dataType: 'EmailAnalyticsStatusResponseType'}
});
