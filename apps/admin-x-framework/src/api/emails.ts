import { createMutation } from '../utils/api/hooks';
import { postsDataType } from './posts';
import type { Email } from './content-types';

export interface EmailsResponseType {
  emails: Email[];
}

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
