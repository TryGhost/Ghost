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
 * The draft's remembered newsletter, shared by the preview and the publish flow
 * so a pick in either carries to the other. A pick holds for this visit even where
 * storage is blocked.
 *
 * `newsletters` is the site's full list, or null while it is loading; the last
 * list seen is kept, so a refetch does not drop the pick under an open flow.
 */
export function useDraftNewsletter({
  postId,
  status,
  newsletters,
}: {
  postId: string;
  status: PostStatus;
  newsletters: ReadonlyArray<NewsletterInput> | null;
}): DraftNewsletterControl {
  const [entry, setEntry] = useState(() => ({
    postId,
    slug: readDraftNewsletter(draftNewsletterStorage(), postId),
  }));
  if (entry.postId !== postId) {
    setEntry({ postId, slug: readDraftNewsletter(draftNewsletterStorage(), postId) });
  }
  const [knownNewsletters, setKnownNewsletters] = useState(newsletters);
  if (newsletters && newsletters !== knownNewsletters) {
    setKnownNewsletters(newsletters);
  }
  const list = newsletters ?? knownNewsletters;

  const resolved = resolveDraftNewsletter({
    status,
    stored: entry.postId === postId ? entry.slug : null,
    newsletters: list,
  });

  // An entry for a newsletter since archived or deleted is dropped once it is seen.
  const { stale } = resolved;
  useEffect(() => {
    if (!stale) {
      return;
    }
    writeDraftNewsletter(draftNewsletterStorage(), postId, null);
    setEntry({ postId, slug: null });
  }, [postId, stale]);

  const store = useCallback(
    (slug: string, known: ReadonlyArray<NewsletterInput>) => {
      const stored = draftNewsletterToStore(slug, known);
      writeDraftNewsletter(draftNewsletterStorage(), postId, stored);
      setEntry({ postId, slug: stored });
    },
    [postId],
  );

  // The preview can offer its own newsletter list before this one has loaded, and
  // only the list says whether a pick is the default, so such a pick waits for it.
  const [pendingPick, setPendingPick] = useState<{ postId: string; slug: string } | null>(null);
  useEffect(() => {
    if (!pendingPick || !list) {
      return;
    }
    if (pendingPick.postId === postId) {
      store(pendingPick.slug, list);
    }
    setPendingPick(null);
  }, [postId, list, pendingPick, store]);

  const remember = useCallback(
    (slug: string) => {
      if (!list) {
        setPendingPick({ postId, slug });
        return;
      }
      store(slug, list);
    },
    [postId, list, store],
  );

  const forget = useCallback(() => {
    writeDraftNewsletter(draftNewsletterStorage(), postId, null);
  }, [postId]);

  return { slug: resolved.slug ?? undefined, remember, forget };
}
