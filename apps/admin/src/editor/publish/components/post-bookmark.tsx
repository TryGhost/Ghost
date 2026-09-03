import { Stack, Text } from '@tryghost/shade/primitives';
import { publishCompleteBookmark } from '@tryghost/test-data/selectors/editor';
import type { PublishFlowPost } from '@/editor/publish/flow-post';

export interface PostBookmarkProps {
  post: PublishFlowPost;
  siteTitle?: string;
}

/** The link-preview card Ember renders as `GhPostBookmark`. */
export function PostBookmark({ post, siteTitle }: PostBookmarkProps) {
  return (
    <a
      className="block overflow-hidden rounded-lg border border-border-default"
      data-testid={publishCompleteBookmark}
      href={post.url ?? '#'}
      rel="noopener noreferrer"
      target="_blank"
    >
      {post.featureImage ? (
        <div
          className="aspect-video bg-cover bg-center"
          style={{ backgroundImage: `url(${post.featureImage})` }}
        />
      ) : null}
      <Stack className="p-5" gap="xs">
        <Text size="lg" weight="bold">
          {post.title}
        </Text>
        {post.excerpt ? (
          <Text className="line-clamp-2" tone="secondary">
            {post.excerpt}
          </Text>
        ) : null}
        {siteTitle ? (
          <Text size="sm" tone="tertiary">
            {siteTitle}
          </Text>
        ) : null}
      </Stack>
    </a>
  );
}
