import { useCallback, useEffect, useState } from 'react';
import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';
import {
  draftNewsletterStorage,
  draftNewsletterToStore,
  readDraftNewsletter,
  resolveDraftNewsletter,
  writeDraftNewsletter,
} from './draft-newsletter';
import type { NewsletterInput } from './publish-options';

export interface DraftNewsletterControl {
  /** The newsletter the draft's preview and publish flow start on; undefined for the default. */
  slug: string | undefined;
  /** Remembers a newsletter the writer picked for the draft; picking the default forgets it. */
  remember: (slug: string) => void;
  /**
   * Forgets the draft's newsletter once a send or schedule has used it. Only the
   * store changes: the editor leaves straight after, and an open flow must not
   * switch newsletters under its confirmation while it does.
   */
  forget: () => void;
}

/**
 * The draft's remembered newsletter (admin7EditorImprovements), shared by the
 * preview and the publish flow so a pick in either carries to the other. With the
 * flag off nothing is read or written. A pick holds for this visit even where
 * storage is blocked.
 *
 * `newsletters` is the site's full list, or null while it is loading; the last
 * list seen is kept, so a refetch does not drop the pick under an open flow.
 */
export function useDraftNewsletter({
  enabled,
  postId,
  status,
  newsletters,
}: {
  enabled: boolean;
  postId: string;
  status: PostStatus;
  newsletters: ReadonlyArray<NewsletterInput> | null;
}): DraftNewsletterControl {
  // The flag can resolve after the editor opens, so the entry is read again when it does.
  const key = `${postId}:${enabled}`;
  const [entry, setEntry] = useState(() => ({
    key,
    slug: readDraftNewsletter(draftNewsletterStorage(enabled), postId),
  }));
  if (entry.key !== key) {
    setEntry({ key, slug: readDraftNewsletter(draftNewsletterStorage(enabled), postId) });
  }
  const [knownNewsletters, setKnownNewsletters] = useState(newsletters);
  if (newsletters && newsletters !== knownNewsletters) {
    setKnownNewsletters(newsletters);
  }
  const list = newsletters ?? knownNewsletters;

  const resolved = resolveDraftNewsletter({
    enabled,
    status,
    stored: entry.key === key ? entry.slug : null,
    newsletters: list,
  });

  // An entry for a newsletter since archived or deleted is dropped once it is seen.
  const { stale } = resolved;
  useEffect(() => {
    if (!stale) {
      return;
    }
    writeDraftNewsletter(draftNewsletterStorage(enabled), postId, null);
    setEntry({ key, slug: null });
  }, [enabled, key, postId, stale]);

  const remember = useCallback(
    (slug: string) => {
      if (!enabled) {
        return;
      }
      const stored = draftNewsletterToStore(slug, list ?? []);
      writeDraftNewsletter(draftNewsletterStorage(enabled), postId, stored);
      setEntry({ key, slug: stored });
    },
    [enabled, key, list, postId],
  );

  const forget = useCallback(() => {
    writeDraftNewsletter(draftNewsletterStorage(enabled), postId, null);
  }, [enabled, postId]);

  return { slug: resolved.slug ?? undefined, remember, forget };
}
