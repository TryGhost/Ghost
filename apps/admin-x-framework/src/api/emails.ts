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
