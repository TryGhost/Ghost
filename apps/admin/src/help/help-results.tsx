import { Button, Card, Skeleton } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import type { HelpArticle } from './help-center';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import type { HelpSearch } from './use-help-search';

/*
 * A search's results: up to three help center articles, each with its title,
 * excerpt and topic, read in the panel. While the search runs, rows of the
 * same shape stand in. Nothing found, or DocsBot out of reach, offers the
 * support team.
 */

interface HelpResultProps {
  article: HelpArticle;
  opened: boolean;
  step: number;
  onOpen: (article: HelpArticle) => void;
}

function HelpResult({ article, opened, step, onOpen }: HelpResultProps) {
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

const PLACEHOLDERS = ['first', 'second', 'third'] as const;

interface HelpResultsProps {
  search: HelpSearch;
  openedArticles: HelpArticle[];
  onRead: (article: HelpArticle) => void;
  onRetry: () => void;
  onContactSupport: () => void;
}

export function HelpResults({
  search,
  openedArticles,
  onRead,
  onRetry,
  onContactSupport,
}: HelpResultsProps) {
  if (search.status === 'searching') {
    return (
      <Stack aria-label="Searching the help center" gap="sm" role="status" aria-busy>
        <p className="help-working-shimmer text-sm font-medium">Searching the help center</p>
        {PLACEHOLDERS.map((key) => (
          <Card key={key}>
            <Box padding="md">
              <Skeleton className="h-4 w-2/3" containerClassName="flex" />
              <Skeleton className="mt-2.5 h-3.5 w-full" containerClassName="flex" />
              <Skeleton className="mt-1.5 h-3.5 w-4/5" containerClassName="flex" />
            </Box>
          </Card>
        ))}
      </Stack>
    );
  }

  if (search.status === 'error') {
    return (
      <Stack className={REVEAL_CLASS_NAME} gap="md">
        <Text leading="relaxed">
          The help center couldn’t be searched just now. Try again, or ask the Ghost(Pro) support
          team.
        </Text>
        <Inline gap="sm">
          <Button size="sm" variant="outline" onClick={onRetry}>
            <LucideIcon.RotateCw />
            Try again
          </Button>
          <Button size="sm" variant="ghost" onClick={onContactSupport}>
            Contact support
          </Button>
        </Inline>
      </Stack>
    );
  }

  if (!search.results.length) {
    return (
      <Stack className={REVEAL_CLASS_NAME} gap="md">
        <Text leading="relaxed">
          No help article matches “{search.query}”. Try other words, or ask the Ghost(Pro) support
          team and a person will pick it up.
        </Text>
        <Inline>
          <Button size="sm" onClick={onContactSupport}>
            <LucideIcon.MessageCircle />
            Contact support
          </Button>
        </Inline>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Text className={REVEAL_CLASS_NAME} size="sm" tone="tertiary">
        From the help center
      </Text>
      {search.results.map((article, index) => (
        <HelpResult
          key={article.id}
          article={article}
          opened={openedArticles.some(({ id }) => id === article.id)}
          step={index + 1}
          onOpen={onRead}
        />
      ))}
    </Stack>
  );
}
