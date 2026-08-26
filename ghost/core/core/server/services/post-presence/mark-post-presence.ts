import logging from '@tryghost/logging';
import postPresence from './index';

type StaffUser = {
  id: string;
  get: (key: string) => unknown;
};

type ApiFrame = {
  user?: StaffUser;
  options?: {
    context?: {
      api_key?: unknown;
    };
  };
};

type PostAuthor = {
  id?: string | null;
};

type PostData = {
  id?: string;
  authors?: PostAuthor[] | null;
};

type PostLike = PostData & {
  toJSON?: () => PostData;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getPostData(post: PostLike | null | undefined): PostData | null {
  if (!post) {
    return null;
  }
  if (typeof post.toJSON === 'function') {
    return post.toJSON();
  }
  return post;
}

/**
 * Best-effort presence heartbeat fired from editor saves. Presence
 * failures must never break the parent posts/pages API response.
 */
export function markPostPresence(
  frame: ApiFrame | null | undefined,
  post: PostLike | null | undefined,
): void {
  try {
    if (!frame || !frame.user || !post) {
      return;
    }
    if (frame.options?.context?.api_key) {
      return;
    }

    const postData = getPostData(post);
    if (!postData?.id) {
      return;
    }

    const postContext = Array.isArray(postData.authors)
      ? {
          authorIds: postData.authors
            .map((author) => author?.id)
            .filter((id): id is string => Boolean(id)),
        }
      : undefined;

    postPresence.mark(
      postData.id,
      {
        id: frame.user.id,
        name: asString(frame.user.get('name')),
        profileImage: asNullableString(frame.user.get('profile_image')),
      },
      postContext,
    );
  } catch (err) {
    logging.warn({ err }, 'Failed to record post presence');
  }
}
