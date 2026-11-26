import type { Site } from '#support/site';
import { slackPing } from '../services/slack-ping.service';
import type { SlackAuthor } from '../services/slack-ping.service';

type PostModel = {
  related(relation: string): { toJSON(): unknown[] };
  toJSON(): Record<string, unknown>;
};

export default function pingSlackWhenPostPublished(
  site: Site,
  model: PostModel,
  options?: { importing?: boolean },
) {
  // CASE: do not ping slack if we import a database
  // TODO: refactor post.published events to never fire on importing
  if (options && options.importing) {
    return;
  }

  return slackPing(site).ping({
    ...model.toJSON(),
    authors: model.related('authors').toJSON() as SlackAuthor[],
    // tags are needed so the lazy URL service can evaluate collection
    // filters (e.g. `tag:foo`) when resolving the post URL; without them
    // a tag-filtered post resolves to /404/
    tags: model.related('tags').toJSON(),
  });
}
