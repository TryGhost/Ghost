import { createMutation, createQueryWithId } from '../utils/api/hooks';
import { postsDataType } from './posts';
import type { Email } from './content-types';

export interface EmailsResponseType {
  emails: Email[];
}

export type EmailSendingPhase = 'preparing' | 'submitting';

export interface EmailSendingProgress {
  completed: number;
  total: number;
  estimated_seconds_remaining: number | null;
}

export type EmailSendingState =
  | {
      status: EmailSendingPhase | 'submitted';
      progress: EmailSendingProgress;
    }
  | {
      status: 'failed';
      progress: EmailSendingProgress;
      failed_during: EmailSendingPhase;
    };

export interface EmailSendingStatus {
  id: string;
  sending: EmailSendingState;
}

export interface EmailStatusesResponseType {
  email_statuses: EmailSendingStatus[];
}

export const useEmailSendingStatus = createQueryWithId<EmailStatusesResponseType>({
  dataType: 'EmailStatusesResponseType',
  path: (id) => `/emails/${id}/status/`,
});

/**
 * Retry a failed email send.
 *
 * The framework has no email queries - the email consumers see is the copy
 * embedded on the post (the editor read contract includes `email`), so a
 * successful retry invalidates post queries to refresh that embedded copy.
 */
export const useRetryEmail = createMutation<EmailsResponseType, string>({
  method: 'PUT',
  path: (id) => `/emails/${id}/retry/`,
  body: () => ({}),
  invalidateQueries: { dataType: postsDataType },
});
