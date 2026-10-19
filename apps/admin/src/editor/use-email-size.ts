import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { EmailPreviewResponseSchema } from '@tryghost/admin-x-framework/api/email-previews';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import type { PublishFlowPost } from './publish/flow-post';
import { estimateEmailSize, type EmailSizeEstimate } from './email-size';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useEditorSettings } from './use-editor-settings';

// Its own key: the preview modal's renders vary by newsletter and audience, this one never does.
const EMAIL_SIZE_QUERY_KEY = 'EditorEmailSize';
export const EMAIL_SIZE_REFETCH_DEBOUNCE_MS = 500;

/** Whether a post could still go out as a newsletter, and so has a size worth warning about. */
function couldBeEmailed(post: PublishFlowPost): boolean {
  const hasEmail = !!post.email || post.emailOnly === true;
  return post.status !== 'published' && post.displayName !== 'page' && !hasEmail;
}

/**
 * The estimated size of the email a saved post would be sent as, re-estimated
 * each time a new version of the post is saved. Null while there is nothing to
 * warn about, including when the estimate could not be made.
 */
export function useEmailSize(post: PublishFlowPost): EmailSizeEstimate | null {
  const fetchApi = useFetchApi();
  const { data: settingsData } = useEditorSettings();
  const { data: siteData } = useBrowseSite({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const [updatedAt] = useDebounce(post.updatedAt ?? null, EMAIL_SIZE_REFETCH_DEBOUNCE_MS);
  const recipients = getSettingValue<string>(
    settingsData?.settings ?? null,
    'editor_default_email_recipients',
  );
  const siteUrl = siteData?.site.url;
  const enabled =
    !!post.id &&
    !!updatedAt &&
    !!siteUrl &&
    !!recipients &&
    recipients !== 'disabled' &&
    couldBeEmailed(post);

  const { data } = useQuery({
    queryKey: [EMAIL_SIZE_QUERY_KEY, post.id, updatedAt, siteUrl],
    queryFn: async (): Promise<EmailSizeEstimate | null> => {
      try {
        const response = EmailPreviewResponseSchema.parse(
          await fetchApi(apiUrl(`/email_previews/posts/${post.id}/`), EDITOR_REQUEST_OPTIONS),
        );
        return estimateEmailSize(response.email_previews[0].html, siteUrl ?? '');
      } catch {
        return null;
      }
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  return enabled ? (data ?? null) : null;
}
