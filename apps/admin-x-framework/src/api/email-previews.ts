import { createMutation, createQueryWithId } from '../utils/api/hooks';

export type EmailPreview = {
  html: string;
  plaintext: string;
  subject: string;
};

export interface EmailPreviewResponseType {
  email_previews: EmailPreview[];
}

export interface EmailPreviewParams {
  memberStatus?: 'free' | 'paid';
  /** Tier slug - narrows the paid audience to a single tier */
  memberTier?: string;
  /** Newsletter slug - the server falls back to the post's, then the default newsletter */
  newsletter?: string;
}

const dataType = 'EmailPreviewResponseType';

const useEmailPreviewQuery = createQueryWithId<EmailPreviewResponseType>({
  dataType,
  path: (id) => `/email_previews/posts/${id}/`,
});

export const useEmailPreview = (
  id: string,
  options: EmailPreviewParams & Parameters<typeof useEmailPreviewQuery>[1] = {},
) => {
  const { memberStatus, memberTier, newsletter, searchParams, ...query } = options;

  const params: Record<string, string> = { ...searchParams };
  if (memberStatus) {
    params.member_status = memberStatus;
  }
  if (memberTier) {
    params.member_tier = memberTier;
  }
  if (newsletter) {
    params.newsletter = newsletter;
  }

  return useEmailPreviewQuery(id, { ...query, searchParams: params });
};

export interface SendTestEmailPayload {
  postId: string;
  /** The server accepts exactly one recipient per request */
  emails: string[];
  memberStatus?: 'free' | 'paid';
  memberTier?: string;
  newsletter?: string;
}

/** Sends a test email for a post. Responds 204 with no body. */
export const useSendTestEmail = createMutation<unknown, SendTestEmailPayload>({
  method: 'POST',
  path: ({ postId }) => `/email_previews/posts/${postId}/`,
  body: ({ emails, memberStatus, memberTier, newsletter }) => ({
    emails,
    ...(newsletter && { newsletter }),
    ...(memberStatus && { member_status: memberStatus }),
    ...(memberTier && { member_tier: memberTier }),
  }),
});
