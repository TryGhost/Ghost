import { randomUUID } from 'node:crypto';
import type { ExportDOMOptions, ExportDOMOutput } from '@tryghost/kg-default-nodes';

const { LexicalHTMLRenderer } = require('@tryghost/kg-lexical-html-renderer');
const { DEFAULT_NODES } = require('@tryghost/kg-default-nodes');
const gating = require('../../api/endpoints/utils/serializers/output/utils/post-gating');

const renderer = new LexicalHTMLRenderer({
  nodes: DEFAULT_NODES,
  onError(error: Error) {
    throw error;
  },
});

interface PostContent {
  visibility: string;
  tiers?: unknown[];
  lexical?: string | null;
}

function countCardIds(root: unknown) {
  const counts = new Map<string, number>();
  const pending = [root];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== 'object') {
      continue;
    }
    const node = value as Record<string, unknown>;
    if (node.type === 'addon' && typeof node.id === 'string' && node.id.trim()) {
      counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
    }
    if (Array.isArray(node.children)) {
      pending.push(...node.children);
    }
  }
  return counts;
}

/** Gate ephemeral markers made from actual rendered nodes through the website path. */
export async function getPostCardAccess(post: PostContent, member: unknown) {
  const cards: { id: string; marker: string }[] = [];
  const state = post.lexical ? JSON.parse(post.lexical) : null;
  // The renderer can omit nested decorators. They still make a saved ID
  // ambiguous, so count the serialized child tree independently of output.
  const counts = countCardIds(state?.root);
  const html = post.lexical
    ? await renderer.render(state, {
        nodeRenderers: {
          addon(
            node: {
              id: string;
              exportDOM: (editor: unknown, options: ExportDOMOptions) => ExportDOMOutput;
            },
            options: ExportDOMOptions,
          ) {
            // Preserve the real renderer's validation and markup. Even fallback
            // comments can affect the website's subsequent HTML gating.
            const rendered = node.exportDOM(null, { ...options, nodeRenderers: undefined });
            const element = rendered.element;
            if (element && 'setAttribute' in element && element.hasAttribute('data-addon-id')) {
              const marker = randomUUID();
              element.setAttribute('data-ghost-access-probe', marker);
              cards.push({ id: node.id, marker });
            }
            return rendered;
          },
        },
      })
    : '';
  const gated = gating.forPost(
    { ...post, html },
    { options: {}, original: { context: { member } } },
  );
  return {
    access: gated.access,
    visible_card_ids: cards
      .filter((card) => counts.get(card.id) === 1 && gated.html.includes(card.marker))
      .map((card) => card.id),
  };
}
