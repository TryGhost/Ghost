/**
 * Ported from `apps/ember-admin/app/utils/public-preview-warning.js`. The
 * caller gates the result on the `paywallImprovements` flag, as Ember does.
 */

export type PublicPreviewWarning = 'public-access' | 'no-content-before' | 'no-content-after';

interface LexicalNode {
  type?: string;
  text?: unknown;
  children?: unknown;
}

export interface PublicPreviewWarningPost {
  /** The unsaved body when the editor has one, else the persisted body. */
  lexical?: string | object | null;
  visibility?: string | null;
}

function parseLexicalState(lexical: string | object | null | undefined): LexicalNode | null {
  if (!lexical) {
    return null;
  }

  try {
    return (typeof lexical === 'string' ? JSON.parse(lexical) : lexical) as LexicalNode;
  } catch {
    return null;
  }
}

function hasContent(node: unknown): boolean {
  const candidate = node as LexicalNode | null;

  if (!candidate || candidate.type === 'paywall' || candidate.type === 'linebreak') {
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
  const state = parseLexicalState(post.lexical) as { root?: { children?: unknown } } | null;
  const children = state?.root?.children;

  if (!Array.isArray(children)) {
    return null;
  }

  const publicPreviewIndex = children.findIndex(
    (node) => (node as LexicalNode | null)?.type === 'paywall',
  );

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
