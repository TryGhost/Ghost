/**
 * Ported from `apps/ember-admin/app/utils/public-preview-warning.js`. The
 * caller gates the result on the `paywallImprovements` flag, as Ember does.
 */

import { z } from 'zod';

export type PublicPreviewWarning = 'public-access' | 'no-content-before' | 'no-content-after';

const lexicalNodeSchema = z.looseObject({
  type: z.string(),
  text: z.unknown().optional(),
  children: z.array(z.unknown()).optional(),
});

const lexicalStateSchema = z.looseObject({
  root: z.looseObject({
    children: z.array(z.unknown()),
  }),
});

export interface PublicPreviewWarningPost {
  /** The unsaved body when the editor has one, else the persisted body. */
  lexical?: string | object | null;
  visibility?: string | null;
}

function parseLexicalState(
  lexical: string | object | null | undefined,
): z.infer<typeof lexicalStateSchema> | null {
  if (!lexical) {
    return null;
  }

  try {
    const candidate: unknown = typeof lexical === 'string' ? JSON.parse(lexical) : lexical;
    const parsed = lexicalStateSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function hasContent(node: unknown): boolean {
  const parsed = lexicalNodeSchema.safeParse(node);

  if (!parsed.success) {
    return false;
  }

  const candidate = parsed.data;

  if (candidate.type === 'paywall' || candidate.type === 'linebreak') {
    return false;
  }

  if (typeof candidate.text === 'string') {
    return Boolean(candidate.text.trim());
  }

  if (candidate.type === 'text' || candidate.type === 'extended-text') {
    return false;
  }

  if (Array.isArray(candidate.children)) {
    return candidate.children.some(hasContent);
  }

  return candidate.type !== 'paragraph' && candidate.type !== 'root';
}

export function getPublicPreviewWarning(
  post: PublicPreviewWarningPost,
): PublicPreviewWarning | null {
  const state = parseLexicalState(post.lexical);
  const children = state?.root?.children;

  if (!children) {
    return null;
  }

  const publicPreviewIndex = children.findIndex((node) => {
    const parsed = lexicalNodeSchema.safeParse(node);
    return parsed.success && parsed.data.type === 'paywall';
  });

  if (publicPreviewIndex === -1) {
    return null;
  }

  if (post.visibility === 'public') {
    return 'public-access';
  }

  if (!children.slice(0, publicPreviewIndex).some(hasContent)) {
    return 'no-content-before';
  }

  if (!children.slice(publicPreviewIndex + 1).some(hasContent)) {
    return 'no-content-after';
  }

  return null;
}

export const PUBLIC_PREVIEW_WARNING_COPY: Record<
  PublicPreviewWarning,
  { title: string; body: string }
> = {
  'no-content-before': {
    title: 'Nothing above the public preview',
    body: 'Add some content above the public preview so everyone has something to read before the paywall.',
  },
  'no-content-after': {
    title: 'Nothing below the public preview',
    body: 'Add some content below the public preview for subscribers who have access to the full post.',
  },
  'public-access': {
    title: 'Public preview has no effect',
    body: 'This post is public, so everyone can read the full post and the public preview won’t have any effect.',
  },
};
