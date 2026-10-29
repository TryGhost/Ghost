import { Card } from '@tryghost/shade/components';
import { Box, Inline, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import type { HelpArticle } from './help-center';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';

/*
 * Cards for what to read next, under an article (help-article-view.tsx):
 * a help center article, read in the panel, or a page elsewhere, opened in
 * a new tab.
 */

interface HelpResultProps {
  article: HelpArticle;
  opened: boolean;
  step: number;
  onOpen: (article: HelpArticle) => void;
}

/** One result: the article's title, excerpt and topic, opening it in the panel. */
export function HelpResult({ article, opened, step, onOpen }: HelpResultProps) {
  return (
    // Opens the article in the panel; it links out to the help center from there
    <button
      className={cn(
        'group block w-full rounded-xl text-left outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring',
        REVEAL_CLASS_NAME,
      )}
      style={revealAt(step)}
      type="button"
      onClick={() => onOpen(article)}
    >
      <Card>
        <Box padding="md">
          <Inline align="start" gap="sm" justify="between">
            <Text leading="snug" weight="semibold">
              {article.title}
            </Text>
            <LucideIcon.ChevronRight className="mt-0.5 size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </Inline>
          {article.excerpt && (
            <Text className="mt-1.5 line-clamp-3" leading="snug" size="sm" tone="secondary">
              {article.excerpt}
            </Text>
          )}
          <Inline align="center" className="mt-2" gap="xs">
            <Text size="xs" tone="tertiary">
              {article.tags[0]?.name ?? 'Help center'}
            </Text>
            {opened && (
              <Text size="xs" tone="tertiary">
                · Read
              </Text>
            )}
          </Inline>
        </Box>
      </Card>
    </button>
  );
}

/** A page beyond the article list (a Ghost resource, say): it opens in a new tab. */
export function HelpLinkCard({ title, url, step }: { title: string; url: string; step: number }) {
  return (
    <a
      className={cn(
        'group block w-full rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring',
        REVEAL_CLASS_NAME,
      )}
      href={url}
      rel="noopener noreferrer"
      style={revealAt(step)}
      target="_blank"
    >
      <Card>
        <Box padding="md">
          <Inline align="start" gap="sm" justify="between">
            <Text leading="snug" weight="semibold">
              {title}
            </Text>
            <LucideIcon.ArrowUpRight className="mt-0.5 size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </Inline>
          <Text className="mt-2 truncate" size="xs" tone="tertiary">
            {new URL(url).hostname}
          </Text>
        </Box>
      </Card>
    </a>
  );
}
