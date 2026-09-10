import { createMutation, createQueryWithId } from '../utils/api/hooks';
import { postsDataType } from './posts';
import type { Email } from './content-types';
import { z } from 'zod';

export interface EmailsResponseType {
  emails: Email[];
}

export interface RetryEmailPayload {
  id: string;
  /** False when the caller handles an expired session itself instead of leaving the page. */
  sessionExpiryRedirect?: boolean;
}

export const EmailBatchStatusSchema = z.enum(['pending', 'submitting', 'submitted', 'failed']);

export const EmailBatchSchema = z.object({
  id: z.string(),
  status: EmailBatchStatusSchema,
});

export const EmailBatchesResponseSchema = z.object({
  batches: z.array(EmailBatchSchema),
});

export const EmailSendingPhaseSchema = z.enum(['preparing', 'submitting']);

export const EmailSendingProgressSchema = z.object({
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  estimated_seconds_remaining: z.number().int().nonnegative().nullable(),
});

export const EmailSendingStateSchema = z.discriminatedUnion('status', [
  z.object({
    status: EmailSendingPhaseSchema,
    progress: EmailSendingProgressSchema,
  }),
  z.object({
    status: z.literal('submitted'),
    progress: EmailSendingProgressSchema,
  }),
  z.object({
    status: z.literal('failed'),
    progress: EmailSendingProgressSchema,
    failed_during: EmailSendingPhaseSchema,
  }),
]);

export const EmailSendingStatusSchema = z.object({
  id: z.string(),
  sending: EmailSendingStateSchema,
});

export const EmailStatusesResponseSchema = z.object({
  email_statuses: z.array(EmailSendingStatusSchema),
});

export type EmailSendingPhase = z.infer<typeof EmailSendingPhaseSchema>;
export type EmailSendingProgress = z.infer<typeof EmailSendingProgressSchema>;
export type EmailSendingState = z.infer<typeof EmailSendingStateSchema>;
export type EmailSendingStatus = z.infer<typeof EmailSendingStatusSchema>;
export type EmailStatusesResponseType = z.infer<typeof EmailStatusesResponseSchema>;
export type EmailBatch = z.infer<typeof EmailBatchSchema>;
export type EmailBatchesResponseType = z.infer<typeof EmailBatchesResponseSchema>;

const emailStatusesDataType = 'EmailStatusesResponseType';
const emailBatchesDataType = 'EmailBatchesResponseType';

export const useBrowseEmailBatches = createQueryWithId<EmailBatchesResponseType>({
  dataType: emailBatchesDataType,
  path: (id) => `/emails/${id}/batches/`,
  parseResponse: (data) => EmailBatchesResponseSchema.parse(data),
});

export const useEmailSendingStatus = createQueryWithId<EmailStatusesResponseType>({
  dataType: emailStatusesDataType,
  path: (id) => `/emails/${id}/status/`,
  parseResponse: (data) => EmailStatusesResponseSchema.parse(data),
});

/**
 * Retry a failed email send.
 *
 * A successful retry invalidates post queries to refresh the embedded email.
 * Sending-status consumers separately refresh their status queries after retry.
 */
export const useRetryEmail = createMutation<EmailsResponseType, RetryEmailPayload>({
  method: 'PUT',
  path: ({ id }) => `/emails/${id}/retry/`,
  body: () => ({}),
  requestOptions: ({ sessionExpiryRedirect }) => ({ sessionExpiryRedirect }),
  invalidateQueries: { dataType: postsDataType },
});

export interface EmailDebugBatch extends EmailBatch {
  created_at?: string | null;
  member_segment?: string | null;
  mailgun_message_id?: string | null;
  error_message?: string | null;
  error_status_code?: number | null;
  count?: { recipients: number };
}

export interface EmailRecipientFailure {
  id: string;
  severity: 'temporary' | 'permanent';
  code: number;
  enhanced_code?: string | null;
  message: string;
  email_recipient?: { member_name?: string | null; member_email?: string | null } | null;
  member?: { id: string; name?: string | null; avatar_image?: string | null } | null;
}

export interface EmailAnalyticsJob {
  running?: boolean;
  lastStarted?: string | null;
  lastBegin?: string | null;
  lastEventTimestamp?: string | null;
  fetchedThrough?: string | null;
  lagSeconds?: number | null;
  canceled?: boolean;
  schedule?: { begin: string; end: string } | null;
}

export interface EmailAnalyticsStatus {
  latest?: EmailAnalyticsJob;
  latestOpened?: EmailAnalyticsJob;
  missing?: EmailAnalyticsJob;
  scheduled?: EmailAnalyticsJob;
}

const emailAnalyticsDataType = 'EmailAnalyticsStatus';

export const useEmail = createQueryWithId<EmailsResponseType>({
  dataType: 'EmailsResponseType',
  path: (id) => `/emails/${id}/`,
});

// The sending-status query parses a minimal projection. Keep diagnostic details
// in a separate query so its schema does not discard the full batch response.
export const useEmailDebugBatches = createQueryWithId<{ batches: EmailDebugBatch[] }>({
  dataType: 'EmailDebugBatches',
  path: (id) => `/emails/${id}/batches/`,
  defaultSearchParams: {
    include: 'count.recipients',
    limit: 'all',
    order: 'status asc, created_at desc',
  },
});

export const useEmailRecipientFailures = createQueryWithId<{ failures: EmailRecipientFailure[] }>({
  dataType: 'EmailRecipientFailures',
  path: (id) => `/emails/${id}/recipient-failures/`,
  defaultSearchParams: { include: 'member,email_recipient', limit: 'all' },
});

export const useEmailAnalyticsStatus = createQueryWithId<EmailAnalyticsStatus>({
  dataType: emailAnalyticsDataType,
  path: (id) => `/emails/${id}/analytics/`,
});

export const useScheduleEmailAnalytics = createMutation<
  unknown,
  { id: string; begin?: string; end?: string }
>({
  method: 'PUT',
  path: ({ id }) => `/emails/${id}/analytics/`,
  searchParams: ({ begin, end }) => ({ ...(begin ? { begin } : {}), ...(end ? { end } : {}) }),
  body: () => ({}),
  invalidateQueries: { dataType: emailAnalyticsDataType },
});

export const useCancelEmailAnalytics = createMutation<unknown, void>({
  method: 'DELETE',
  path: () => '/emails/analytics/',
  invalidateQueries: { dataType: emailAnalyticsDataType },
});
