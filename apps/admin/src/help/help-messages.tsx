import type React from 'react';
import { useMemo, useState } from 'react';
import { Button, Card, Tooltip, TooltipContent, TooltipTrigger } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { prepareArticleHtml } from './help-article-html';
import type { HelpArticle } from './help-center';
import { renderMarkdown } from './help-markdown';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import { getSiteCardKind } from './help-site-card-kinds';
import type { HelpSignals } from './help-signals';
import { HelpSiteCard } from './help-site-card';
import type { HelpAnswer, HelpAnswerSource, HelpQuestion } from './use-help-conversation';
import { useHelpCenterIndex } from './use-help-center-index';

/*
 * The thread's messages: the question (a filled bubble, with the context used
 * for its answer behind its chevron), and the answer, which runs the panel's
 * full width: its working verb, then DocsBot's answer as it streams in, its
 * steps, site card, the help center pages it drew on (read in the panel) and
 * feedback. The support team is only offered where an answer didn't do it:
 * the error and no-answer states, a thumbs down, an answer DocsBot couldn't
 * find, or a question that asked for a person.
 */

// DocsBot's answer, Markdown rendered as HTML (help-markdown.ts) and styled
// with Admin's tokens, like an article but tighter
const ANSWER_CLASS_NAME = cn(
  'text-md leading-relaxed text-text-primary',
  '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold',
  '[&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:font-semibold',
  '[&_a]:underline [&_a]:underline-offset-2',
  '[&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm',
  '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0',
);

interface HelpAnswerTextProps {
  markdown: string;
  streaming: boolean;
  className?: string;
  style?: React.CSSProperties;
  onReadArticle: (article: HelpArticle) => void;
}

/** DocsBot's answer; its links to help articles open in the panel. */
function HelpAnswerText({
  markdown,
  streaming,
  className,
  style,
  onReadArticle,
}: HelpAnswerTextProps) {
  const index = useHelpCenterIndex(true);
  // Made safe by prepareArticleHtml, which also marks links to help articles
  const html = useMemo(() => prepareArticleHtml(renderMarkdown(markdown)), [markdown]);

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    const slug = target?.closest('a[data-help-slug]')?.getAttribute('data-help-slug');
    const linked = slug ? index.data?.find((candidate) => candidate.slug === slug) : undefined;
    if (linked) {
      event.preventDefault();
      onReadArticle(linked);
    }
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      aria-busy={streaming}
      className={cn(ANSWER_CLASS_NAME, streaming && 'help-streaming', className)}
      style={style}
      onClick={onClick}
    />
  );
}

export function HelpQuestionMessage({ message }: { message: HelpQuestion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-fit max-w-full rounded-xl bg-muted px-2.5 py-2 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <button
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide the context used' : 'Show the context used'}
        className="flex w-full items-start gap-1.5 rounded-sm text-left outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring"
        type="button"
        onClick={() => setExpanded(!expanded)}
      >
        <LucideIcon.ChevronRight
          className={cn(
            'mt-[3px] size-4 shrink-0 text-text-tertiary transition-transform duration-200',
            expanded && 'rotate-90',
          )}
        />
        <Stack className="min-w-0" gap="xs">
          {message.pageLabel && (
            <Inline align="center" className="text-sm text-text-tertiary" gap="xs">
              <LucideIcon.Focus className="size-3.5" />
              {message.pageLabel}
            </Inline>
          )}
          <Text leading="snug" tone="secondary">
            {message.text}
          </Text>
        </Stack>
      </button>
      {expanded && (
        <Stack className="mt-2 ml-[22px] motion-safe:animate-in motion-safe:fade-in" gap="xs">
          <Text size="xs" tone="tertiary" weight="medium">
            Context used for this answer. The question and page name go to DocsBot; the rest stays
            in your browser.
          </Text>
          <ul className="flex flex-col gap-0.5 text-sm text-text-secondary">
            {message.context.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </Stack>
      )}
    </div>
  );
}

interface HelpArticleLinkProps {
  article: HelpArticle;
  opened: boolean;
  /** Off for the best match, whose excerpt leads the answer above it */
  showExcerpt: boolean;
  step: number;
  onOpen: (article: HelpArticle) => void;
}

function HelpArticleLink({ article, opened, showExcerpt, step, onOpen }: HelpArticleLinkProps) {
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
            <Text leading="snug" size="sm" weight="semibold">
              {article.title}
            </Text>
            <LucideIcon.ChevronRight className="size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </Inline>
          {showExcerpt && article.excerpt && (
            <Text className="mt-1 line-clamp-2" leading="snug" size="sm" tone="secondary">
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

/** A page the answer drew on that isn't a help article in the list: it opens in a new tab. */
function HelpSourceLink({ source, step }: { source: HelpAnswerSource; step: number }) {
  return (
    <a
      className={cn(
        'group block w-full rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring',
        REVEAL_CLASS_NAME,
      )}
      href={source.url}
      rel="noopener noreferrer"
      style={revealAt(step)}
      target="_blank"
    >
      <Card>
        <Box padding="md">
          <Inline align="start" gap="sm" justify="between">
            <Text leading="snug" size="sm" weight="semibold">
              {source.title}
            </Text>
            <LucideIcon.ArrowUpRight className="size-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </Inline>
          <Text className="mt-2 truncate" size="xs" tone="tertiary">
            {new URL(source.url).hostname}
          </Text>
        </Box>
      </Card>
    </a>
  );
}

function getCopyText(text: string, articles: HelpArticle[], sources: HelpAnswerSource[]) {
  const links = [...articles, ...sources].map(({ title, url }) => `${title}: ${url}`);
  return [text, ...links].filter(Boolean).join('\n\n');
}

interface HelpAnswerMessageProps {
  message: HelpAnswer;
  signals: HelpSignals;
  openedArticles: HelpArticle[];
  onRate: (id: string, feedback: HelpAnswer['feedback']) => void;
  onReadArticle: (article: HelpArticle) => void;
  onRetry: (id: string) => void;
  onContactSupport: () => void;
  onAskAgain: () => void;
}

export function HelpAnswerMessage({
  message,
  signals,
  openedArticles,
  onRate,
  onReadArticle,
  onRetry,
  onContactSupport,
  onAskAgain,
}: HelpAnswerMessageProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [copied, setCopied] = useState(false);

  if (message.status === 'working' || message.status === 'streaming') {
    return (
      <Stack gap="md" role="status">
        {/* Keyed so each new verb fades in over the last */}
        <p
          key={message.verb}
          className="help-working-shimmer text-sm font-medium motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in"
        >
          {message.verb}
        </p>
        {message.text && (
          <HelpAnswerText markdown={message.text} streaming onReadArticle={onReadArticle} />
        )}
      </Stack>
    );
  }

  if (message.status === 'error' || !message.result) {
    return (
      <div className={REVEAL_CLASS_NAME}>
        <Stack gap="md">
          <Text leading="relaxed">
            The help assistant couldn’t be reached. Try again, or ask the support team.
          </Text>
          <Inline gap="sm">
            <Button size="sm" variant="outline" onClick={() => onRetry(message.id)}>
              <LucideIcon.RotateCw />
              Try again
            </Button>
            <Button size="sm" variant="ghost" onClick={onContactSupport}>
              Contact support
            </Button>
          </Inline>
        </Stack>
      </div>
    );
  }

  const { articles, sources, couldAnswer, supportRequested } = message.result;
  const [top] = articles;
  const siteCard = top ? getSiteCardKind(top.slug, signals.billing) : null;
  const hasSources = articles.length + sources.length > 0;
  const answered = message.text.trim() !== '';
  // Each block's turn to appear: the answer, the site card, the sources heading
  // and each source, then the actions
  const sourcesStep = siteCard ? 2 : 1;
  const actionsStep = sourcesStep + articles.length + sources.length + 1;

  const copy = () => {
    void navigator.clipboard?.writeText(getCopyText(message.text, articles, sources)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Stack gap="lg">
      {/* A request for a person has no steps to show */}
      {!supportRequested && (
        <div>
          <button
            aria-expanded={showSteps}
            className="inline-flex items-center gap-1 rounded-sm text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring"
            type="button"
            onClick={() => setShowSteps(!showSteps)}
          >
            <span className="font-medium text-text-secondary">Answered</span>
            <span className="text-text-tertiary">in {message.seconds}s</span>
            <LucideIcon.ChevronDown
              className={cn(
                'size-3.5 text-text-tertiary transition-transform duration-200',
                showSteps && 'rotate-180',
              )}
            />
          </button>
          {showSteps && (
            <ul className="mt-2 flex flex-col gap-1.5 border-l border-border-default pl-3 text-sm text-text-secondary motion-safe:animate-in motion-safe:fade-in">
              {message.steps.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <LucideIcon.Check className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {answered ? (
        <>
          <HelpAnswerText
            className={REVEAL_CLASS_NAME}
            markdown={message.text}
            streaming={false}
            onReadArticle={onReadArticle}
          />

          {siteCard && (
            <div>
              <HelpSiteCard
                className={REVEAL_CLASS_NAME}
                kind={siteCard}
                signals={signals}
                style={revealAt(1)}
              />
            </div>
          )}

          {/* The pages the answer drew on, in place of links in its text */}
          {hasSources && (
            <Stack gap="sm">
              {articles.map((article, index) => (
                <HelpArticleLink
                  key={article.id}
                  article={article}
                  opened={openedArticles.some(({ id }) => id === article.id)}
                  step={sourcesStep + index + 1}
                  showExcerpt
                  onOpen={onReadArticle}
                />
              ))}
              {sources.map((source, index) => (
                <HelpSourceLink
                  key={source.url}
                  source={source}
                  step={sourcesStep + articles.length + index + 1}
                />
              ))}
            </Stack>
          )}

          {!couldAnswer && !message.feedback && (
            <div className={cn('-mt-2', REVEAL_CLASS_NAME)} style={revealAt(actionsStep)}>
              <Stack gap="md">
                <Text leading="relaxed" tone="secondary">
                  The help center doesn’t seem to cover that. The support team can pick it up.
                </Text>
                <Inline gap="sm">
                  <Button size="sm" onClick={onContactSupport}>
                    <LucideIcon.MessageCircle />
                    Contact support
                  </Button>
                  <Button size="sm" variant="outline" onClick={onAskAgain}>
                    Ask another way
                  </Button>
                </Inline>
              </Stack>
            </div>
          )}

          <Inline
            className={cn('-ml-1.5', REVEAL_CLASS_NAME)}
            gap="xs"
            style={revealAt(actionsStep)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="Copy answer" size="icon-sm" variant="ghost" onClick={copy}>
                  {copied ? <LucideIcon.Check /> : <LucideIcon.Copy />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? 'Copied' : 'Copy'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="This helped"
                  aria-pressed={message.feedback === 'up'}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onRate(message.id, message.feedback === 'up' ? null : 'up')}
                >
                  <LucideIcon.ThumbsUp fill={message.feedback === 'up' ? 'currentColor' : 'none'} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>This helped</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="This didn’t help"
                  aria-pressed={message.feedback === 'down'}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onRate(message.id, message.feedback === 'down' ? null : 'down')}
                >
                  <LucideIcon.ThumbsDown
                    fill={message.feedback === 'down' ? 'currentColor' : 'none'}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>This didn’t help</TooltipContent>
            </Tooltip>
          </Inline>

          {message.feedback === 'up' && (
            <div className={REVEAL_CLASS_NAME}>
              <Text leading="relaxed" tone="secondary">
                Glad that helped. Ask anything else whenever you like.
              </Text>
            </div>
          )}
          {message.feedback === 'down' && (
            <div className={REVEAL_CLASS_NAME}>
              <Stack gap="md">
                <Text leading="relaxed">
                  Sorry that didn’t do it. Try asking another way, or send it to the support team.
                  They’ll see your question and what you’ve already read.
                </Text>
                <Inline gap="sm">
                  <Button size="sm" onClick={onContactSupport}>
                    <LucideIcon.MessageCircle />
                    Contact support
                  </Button>
                  <Button size="sm" variant="outline" onClick={onAskAgain}>
                    Ask another way
                  </Button>
                </Inline>
              </Stack>
            </div>
          )}
        </>
      ) : (
        <div className={REVEAL_CLASS_NAME}>
          <Stack gap="md">
            <Text leading="relaxed">
              {supportRequested
                ? 'Of course. Send the support team a message and a person will pick it up.'
                : 'No answer came back for that. Try other words, or ask the support team and a person will pick it up.'}
            </Text>
            <Inline gap="sm">
              <Button size="sm" onClick={onContactSupport}>
                <LucideIcon.MessageCircle />
                Contact support
              </Button>
              <Button size="sm" variant="outline" onClick={onAskAgain}>
                Ask another way
              </Button>
            </Inline>
          </Stack>
        </div>
      )}
    </Stack>
  );
}
