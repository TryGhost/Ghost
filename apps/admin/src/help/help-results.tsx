import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Skeleton } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { prepareArticleHtml } from './help-article-html';
import { ARTICLE_CONTENT_CLASS_NAME } from './help-article-styles';
import { fetchHelpArticleContent, type HelpArticle } from './help-center';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import type { HelpSearch } from './use-help-search';

/*
 * A search's results: up to three help center articles, read in the panel.
 * The first is shown as a preview, the opening of the article under its
 * title, so the user can tell whether it's the answer before committing to
 * it (the nearest page isn't always). The others follow with their title,
 * excerpt and topic. While the search runs, rows of the same shape stand in.
 * Nothing found, or DocsBot out of reach, offers the support team.
 */

// How much of the article the preview shows before it fades out
const PREVIEW_HEIGHT_CLASS_NAME = 'max-h-56';

interface HelpResultPreviewProps {
  article: HelpArticle;
  opened: boolean;
  onOpen: (article: HelpArticle) => void;
}

/** The first result, with the opening of its article, to judge it by. */
function HelpResultPreview({ article, opened, onOpen }: HelpResultPreviewProps) {
  // The same query the article view uses, so opening it is instant
  const content = useQuery({
    queryKey: ['help-center', 'article', article.slug],
    queryFn: ({ signal }) => fetchHelpArticleContent(article.slug, signal),
    staleTime: 30 * 60 * 1000,
  });
  const html = useMemo(
    () => (content.data ? prepareArticleHtml(content.data.html) : ''),
    [content.data],
  );
  const open = () => onOpen(article);

  return (
    <Card className={REVEAL_CLASS_NAME}>
      <Box padding="md">
        <button
          className="group block w-full rounded-sm text-left outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring"
          type="button"
          onClick={open}
        >
          <Inline align="start" gap="sm" justify="between">
            <Text leading="snug" weight="semibold">
              {article.title}
            </Text>
            <LucideIcon.ChevronRight className="mt-0.5 size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </Inline>
        </button>
        <Inline align="center" className="mt-1" gap="xs">
          <Text size="xs" tone="tertiary">
            {[article.tags[0]?.name ?? 'Help center', opened ? 'Read' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Inline>

        {content.isLoading && (
          <Stack aria-label="Loading the article" className="mt-4" gap="sm">
            {['w-full', 'w-11/12', 'w-4/5'].map((width) => (
              <Skeleton key={width} className={cn('h-3.5', width)} containerClassName="flex" />
            ))}
          </Stack>
        )}
        {content.isError && article.excerpt && (
          <Text className="mt-3" leading="snug" size="sm" tone="secondary">
            {article.excerpt}
          </Text>
        )}
        {content.data && (
          // Made safe by prepareArticleHtml. The preview is a glimpse, not the
          // place to read, so it opens the article rather than following links
          // or zooming images, which are left out of it.
          <div
            aria-label={`The opening of ${article.title}`}
            className={cn(
              'relative mt-3 cursor-pointer overflow-hidden',
              PREVIEW_HEIGHT_CLASS_NAME,
            )}
            role="button"
            tabIndex={-1}
            onClick={open}
          >
            <div
              dangerouslySetInnerHTML={{ __html: html }}
              className={cn(
                ARTICLE_CONTENT_CLASS_NAME,
                'pointer-events-none text-sm [&_audio]:hidden [&_figure]:hidden [&_img]:hidden [&_video]:hidden',
              )}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-card to-transparent" />
          </div>
        )}

        <Button className="mt-3" size="sm" variant="outline" onClick={open}>
          Read the full article
          <LucideIcon.ArrowRight />
        </Button>
      </Box>
    </Card>
  );
}

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

  const [first, ...rest] = search.results;
  const isOpened = (article: HelpArticle) => openedArticles.some(({ id }) => id === article.id);

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Text className={REVEAL_CLASS_NAME} size="sm" tone="tertiary">
          From the help center
        </Text>
        {first && (
          // Keyed so a new search's preview starts afresh
          <HelpResultPreview
            key={first.id}
            article={first}
            opened={isOpened(first)}
            onOpen={onRead}
          />
        )}
      </Stack>
      {rest.length > 0 && (
        <Stack gap="sm">
          <Text className={REVEAL_CLASS_NAME} size="sm" style={revealAt(1)} tone="tertiary">
            More from the help center
          </Text>
          {rest.map((article, index) => (
            <HelpResult
              key={article.id}
              article={article}
              opened={isOpened(article)}
              step={index + 2}
              onOpen={onRead}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
