import { createMutation } from '../utils/api/hooks';
import { postsDataType } from './posts';
import type { Email } from './content-types';

export interface EmailsResponseType {
  emails: Email[];
}

export interface RetryEmailPayload {
  id: string;
  /** False when the caller handles an expired session itself instead of leaving the page. */
  sessionExpiryRedirect?: boolean;
}

/**
 * Retry a failed email send.
 *
 * The framework has no email queries - the email consumers see is the copy
 * embedded on the post (the editor read contract includes `email`), so a
 * successful retry invalidates post queries to refresh that embedded copy.
 */
export const useRetryEmail = createMutation<EmailsResponseType, RetryEmailPayload>({
  method: 'PUT',
  path: ({ id }) => `/emails/${id}/retry/`,
  body: () => ({}),
  requestOptions: ({ sessionExpiryRedirect }) => ({ sessionExpiryRedirect }),
  invalidateQueries: { dataType: postsDataType },
});
