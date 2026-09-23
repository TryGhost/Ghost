import { createHash } from 'node:crypto';
import { InternalServerError } from '@tryghost/errors';

interface CardPost {
  lexical?: string | null;
  visibility?: string;
  status?: string;
  tiers?: unknown[];
}

/** Content and access snapshot identity; timestamps in Ghost have second precision. */
export function cardRevision(post: CardPost): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        lexical: post.lexical ?? null,
        visibility: post.visibility,
        status: post.status,
        tiers:
          post.visibility === 'tiers'
            ? (post.tiers ?? [])
                .map((tier) => {
                  if (
                    !tier ||
                    typeof tier !== 'object' ||
                    !('id' in tier) ||
                    typeof tier.id !== 'string'
                  ) {
                    throw new InternalServerError({ message: 'Invalid tier identity.' });
                  }
                  return tier.id;
                })
                .sort()
            : [],
      }),
    )
    .digest('hex');
}
