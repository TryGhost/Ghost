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
import { prepareArticleHtml } from './help-article-html';
import { fetchHelpArticleContent, type HelpArticle } from './help-center';
import { HelpPanelSizeButton } from './help-panel-size';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import type { HelpConversation } from './use-help-conversation';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * An article read in the panel, so the user doesn't leave Admin for the
 * answer. It takes over the panel like the message to support, with the
 * conversation kept behind it, and ends by asking whether it answered their
 * question: "No" goes straight to the support team.
 *
 * The article's HTML comes from the help center, made safe and readable by
 * help-article-html.ts. Its links to other help articles open in the panel
 * too, its in-article anchors scroll within it, and its images zoom.
 */

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Ghost's article HTML, styled with Admin's tokens: paragraphs and headings,
// lists, code, images with captions, and callout cards
const ARTICLE_CONTENT_CLASS_NAME = cn(
  'text-md leading-relaxed text-text-primary',
  '[&_p]:my-3 [&_strong]:font-semibold',
  '[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:font-semibold',
  '[&_a]:underline [&_a]:underline-offset-2',
  '[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm',
  '[&_figure]:my-5 [&_img]:h-auto [&_img]:max-w-full [&_img]:cursor-zoom-in [&_img]:rounded-lg [&_img]:border [&_img]:border-border-default',
  '[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-text-secondary',
  '[&_.kg-callout-card]:my-4 [&_.kg-callout-card]:flex [&_.kg-callout-card]:gap-3 [&_.kg-callout-card]:rounded-lg [&_.kg-callout-card]:bg-muted [&_.kg-callout-card]:p-4',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border-default [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary',
  '[&_hr]:my-6 [&_hr]:border-border-default',
  '[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:font-semibold',
  // Code blocks and tables scroll sideways rather than widen the panel
  '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:my-4 [&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm',
  '[&_td]:border-b [&_td]:border-border-default [&_td]:px-2 [&_td]:py-1.5 [&_th]:border-b [&_th]:border-border-default [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold',
  // Toggle cards, rebuilt as disclosures (help-article-html.ts)
  '[&_details]:my-3 [&_details]:rounded-lg [&_details]:border [&_details]:border-border-default [&_details]:px-4 [&_details]:py-3',
  '[&_details[open]>summary]:mb-1 [&_summary]:cursor-pointer [&_summary]:font-semibold',
  '[&_audio]:my-4 [&_audio]:w-full [&_video]:w-full [&_video]:rounded-lg',
  '[&_.kg-gallery-image]:min-w-0 [&_.kg-gallery-image]:flex-1 [&_.kg-gallery-row]:flex [&_.kg-gallery-row]:gap-2 [&_.kg-gallery-row+.kg-gallery-row]:mt-2',
  // Bookmark cards: a compact link, without the thumbnail, too wide for the panel
  '[&_.kg-bookmark-container]:my-4 [&_.kg-bookmark-container]:block [&_.kg-bookmark-container]:rounded-lg [&_.kg-bookmark-container]:border [&_.kg-bookmark-container]:border-border-default [&_.kg-bookmark-container]:p-3 [&_.kg-bookmark-container]:no-underline',
  '[&_.kg-bookmark-title]:text-sm [&_.kg-bookmark-title]:font-semibold',
  '[&_.kg-bookmark-description]:mt-1 [&_.kg-bookmark-description]:line-clamp-2 [&_.kg-bookmark-description]:text-sm [&_.kg-bookmark-description]:text-text-secondary',
  '[&_.kg-bookmark-metadata]:mt-2 [&_.kg-bookmark-metadata]:flex [&_.kg-bookmark-metadata]:items-center [&_.kg-bookmark-metadata]:gap-1.5 [&_.kg-bookmark-metadata]:text-xs [&_.kg-bookmark-metadata]:text-text-tertiary',
  '[&_.kg-bookmark-icon]:size-4 [&_.kg-bookmark-icon]:cursor-auto [&_.kg-bookmark-icon]:rounded-none [&_.kg-bookmark-icon]:border-0 [&_.kg-bookmark-thumbnail]:hidden',
);

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
  conversation: HelpConversation;
  showClose: boolean;
  onClose: () => void;
}

export function HelpArticleView({
  article,
  conversation,
  showClose,
  onClose,
}: HelpArticleViewProps) {
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
  const html = useMemo(
    () => (content.data ? prepareArticleHtml(content.data.html) : ''),
    [content.data],
  );
  const topic = article.tags[0]?.name;
  const readingTime = content.data?.readingTime;

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
      conversation.readArticle(linked);
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
            onClick={conversation.leaveArticle}
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

            {/* The point of reading it here: did it answer their question? */}
            <Stack
              className={cn('mt-8 border-t border-border-default pt-5', REVEAL_CLASS_NAME)}
              gap="sm"
              style={revealAt(2)}
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
                    <Button size="sm" variant="outline" onClick={conversation.contactSupport}>
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
