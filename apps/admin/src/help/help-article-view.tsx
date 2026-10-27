import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { prepareArticleHtml, splitFurtherReading } from './help-article-html';
import { ARTICLE_CONTENT_CLASS_NAME } from './help-article-styles';
import { fetchHelpArticleContent, type HelpArticle } from './help-center';
import { HelpPanelSizeButton } from './help-panel-size';
import { HelpLinkCard, HelpResult } from './help-results';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import type { HelpSession } from './use-help-search';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * An article read in the panel, so the user doesn't leave Admin for the
 * answer. It's where a search lands: its first result, or the FAQ question
 * picked. It takes over the panel like the message to support, with the
 * search kept behind it, lists the search's other results under "More from
 * the help center", and ends by asking whether it answered their question:
 * "No" goes straight to the support team.
 *
 * The article's HTML comes from the help center, made safe and readable by
 * help-article-html.ts. Its links to other help articles open in the panel
 * too, its in-article anchors scroll within it, and its images zoom.
 */

// How many things to read next: the article's own further reading is usually
// two, the search adds up to two more
const MORE_LIMIT = 4;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// The lines standing in for an article while it loads: two share a width
const SKELETON_LINES = [
  ['first', 'w-full'],
  ['second', 'w-11/12'],
  ['third', 'w-4/5'],
  ['fourth', 'w-full'],
  ['fifth', 'w-2/3'],
] as const;

interface HelpArticleViewProps {
  article: HelpArticle;
  session: HelpSession;
  showClose: boolean;
  onClose: () => void;
}

export function HelpArticleView({ article, session, showClose, onClose }: HelpArticleViewProps) {
  const index = useHelpCenterIndex(true);
  const titleRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // PROTOTYPE: kept in this component state only; record it (trackEvent) to
  // learn which articles answer questions
  const [answered, setAnswered] = useState(false);
  // An image opened large, as screenshots are hard to read at the panel's width
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);
  const content = useQuery({
    queryKey: ['help-center', 'article', article.slug],
    queryFn: ({ signal }) => fetchHelpArticleContent(article.slug, signal),
    staleTime: 30 * 60 * 1000,
  });
  // The article's own "Further reading" comes out of the body, to show once
  // in the list under it rather than as a second list
  const { html, links } = useMemo(
    () =>
      content.data
        ? splitFurtherReading(prepareArticleHtml(content.data.html))
        : { html: '', links: [] },
    [content.data],
  );
  const topic = article.tags[0]?.name;
  const readingTime = content.data?.readingTime;
  // What to read next: the article's own further reading first (help
  // articles as articles, other pages as links), then the search's other
  // results, each once and never this article
  const more = useMemo(() => {
    const articles: HelpArticle[] = [];
    const elsewhere: { title: string; url: string }[] = [];
    for (const link of links) {
      const known = link.slug ? index.data?.find(({ slug }) => slug === link.slug) : undefined;
      if (known) {
        articles.push(known);
      } else if (!link.slug) {
        elsewhere.push(link);
      }
    }
    articles.push(...(session.search?.results ?? []));
    const seen = new Set([article.id]);
    return {
      articles: articles.filter(({ id }) => !seen.has(id) && seen.add(id)).slice(0, MORE_LIMIT),
      elsewhere: elsewhere.slice(0, MORE_LIMIT),
    };
  }, [links, index.data, session.search, article.id]);
  const moreCount = more.articles.length + more.elsewhere.length;
  const findingMore = session.searching;

  // Focus moves into the article, so keyboard and screen reader users land in it
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // Links in the article: anchors scroll within it, other help articles open
  // in the panel, and images zoom unless they're links
  const onContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    const anchorId = target?.closest('a[data-help-anchor]')?.getAttribute('data-help-anchor');
    if (anchorId) {
      event.preventDefault();
      contentRef.current
        ?.querySelector(`#${CSS.escape(anchorId)}`)
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const slug = target?.closest('a[data-help-slug]')?.getAttribute('data-help-slug');
    const linked = slug ? index.data?.find((candidate) => candidate.slug === slug) : undefined;
    if (linked) {
      event.preventDefault();
      session.readArticle(linked);
      return;
    }
    if (target instanceof HTMLImageElement && !target.closest('a')) {
      setZoomed({ src: target.currentSrc || target.src, alt: target.alt });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-right-4">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-2">
        <Inline align="center" className="min-w-0" gap="xs">
          <Button
            aria-label="Back to help"
            className="shrink-0"
            size="icon-sm"
            variant="ghost"
            onClick={session.leaveArticle}
          >
            <LucideIcon.ArrowLeft />
          </Button>
          <Text
            ref={titleRef}
            as="h2"
            className="outline-hidden"
            size="md"
            tabIndex={-1}
            weight="semibold"
            truncate
          >
            {article.title}
          </Text>
        </Inline>
        <Inline className="shrink-0" gap="xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="Open in the help center" size="icon-sm" variant="ghost" asChild>
                <a href={article.url} rel="noopener noreferrer" target="_blank">
                  <LucideIcon.ArrowUpRight />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in the help center</TooltipContent>
          </Tooltip>
          <HelpPanelSizeButton />
          {showClose && (
            <Button aria-label="Close help" size="icon-sm" variant="ghost" onClick={onClose}>
              <LucideIcon.X />
            </Button>
          )}
        </Inline>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <Text className={REVEAL_CLASS_NAME} size="sm" tone="tertiary">
          {[topic, readingTime ? `${readingTime} min read` : null].filter(Boolean).join(' · ') ||
            'Help center'}
        </Text>

        {content.isLoading && (
          <Stack aria-label="Loading the article" className="mt-6" gap="sm">
            {SKELETON_LINES.map(([line, width]) => (
              <Skeleton key={line} className={cn('h-3.5', width)} containerClassName="flex" />
            ))}
          </Stack>
        )}

        {content.isError && (
          <Stack className="mt-6" gap="md">
            <Text leading="relaxed" tone="secondary">
              The article couldn’t be loaded here.
            </Text>
            <Inline>
              <Button size="sm" variant="outline" asChild>
                <a href={article.url} rel="noopener noreferrer" target="_blank">
                  Open in the help center
                  <LucideIcon.ArrowUpRight />
                </a>
              </Button>
            </Inline>
          </Stack>
        )}

        {content.data && (
          <>
            {/* Made safe by prepareArticleHtml; clicks on its links and images are handled above */}
            <div
              dangerouslySetInnerHTML={{ __html: html }}
              ref={contentRef}
              className={cn('mt-4', ARTICLE_CONTENT_CLASS_NAME, REVEAL_CLASS_NAME)}
              style={revealAt(1)}
              onClick={onContentClick}
            />

            {(moreCount > 0 || findingMore) && (
              <Stack
                className={cn('mt-8 border-t border-border-default pt-5', REVEAL_CLASS_NAME)}
                gap="sm"
                style={revealAt(2)}
              >
                <Text size="sm" tone="tertiary">
                  More from the help center
                </Text>
                {findingMore && !moreCount && (
                  <Skeleton className="h-3.5 w-1/2" containerClassName="flex" />
                )}
                {more.articles.map((result, position) => (
                  <HelpResult
                    key={result.id}
                    article={result}
                    opened={session.openedArticles.some(({ id }) => id === result.id)}
                    step={position + 1}
                    onOpen={session.readArticle}
                  />
                ))}
                {more.elsewhere.map((link, position) => (
                  <HelpLinkCard
                    key={link.url}
                    step={more.articles.length + position + 1}
                    title={link.title}
                    url={link.url}
                  />
                ))}
              </Stack>
            )}

            {/* The point of reading it here: did it answer their question? */}
            <Stack
              className={cn('mt-8 border-t border-border-default pt-5', REVEAL_CLASS_NAME)}
              gap="sm"
              style={revealAt(3)}
            >
              {answered ? (
                <Text leading="snug" tone="secondary">
                  Glad it helped.
                </Text>
              ) : (
                <>
                  <Text size="sm" weight="medium">
                    Did this answer your question?
                  </Text>
                  <Inline gap="sm">
                    <Button size="sm" variant="outline" onClick={() => setAnswered(true)}>
                      <LucideIcon.ThumbsUp />
                      Yes
                    </Button>
                    <Button size="sm" variant="outline" onClick={session.contactSupport}>
                      <LucideIcon.MessageCircle />
                      No, contact support
                    </Button>
                  </Inline>
                </>
              )}
            </Stack>
          </>
        )}
      </div>

      <Dialog open={!!zoomed} onOpenChange={(open) => !open && setZoomed(null)}>
        <DialogContent className="top-[50%] max-w-[min(1200px,92vw)] translate-y-[-50%] p-3">
          <DialogTitle className="sr-only">{zoomed?.alt || article.title}</DialogTitle>
          {zoomed && (
            <img
              alt={zoomed.alt}
              className="max-h-[85vh] w-full rounded-md object-contain"
              src={zoomed.src}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
