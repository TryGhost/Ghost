import { Card, Kbd, Skeleton } from '@tryghost/shade/components';
import { H3, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { type HelpArticle, HELP_CENTER_URL } from './help-center';
import { REVEAL_CLASS_NAME, revealAt } from './help-reveal';
import type { HelpSuggestion } from './use-help-suggestions';

/*
 * What the panel shows before the user searches: a greeting above the search
 * field, and under it, headed with the page's name, up to three numbered
 * questions from the help center's FAQ for the page they're on
 * (use-help-suggestions.ts), as a list in a card like Analytics' section
 * cards. The keys 1 to 3 search for them (handled in help-panel.tsx). While
 * they load, rows of the same size stand in, and when they change (a new
 * page) they cascade in afresh. Completions as the user types take their
 * place.
 */

// Where suggestions go, shown as rows of the same size while they load
const SUGGESTION_SLOTS = [
  { key: 'first', placeholderWidth: 'w-3/5' },
  { key: 'second', placeholderWidth: 'w-2/5' },
  { key: 'third', placeholderWidth: 'w-1/2' },
];

const SUGGESTION_ROW_CLASS_NAME = 'flex w-full items-center gap-3 px-4 py-3';

export function HelpGreeting({ firstName }: { firstName: string }) {
  return (
    <Text as="h3" className={REVEAL_CLASS_NAME} leading="heading" size="xl" weight="semibold">
      {firstName ? `Hi ${firstName}, how can we help?` : 'How can we help?'}
    </Text>
  );
}

interface HelpSuggestionsProps {
  /** The page the questions are for, as the headline names it */
  pageLabel: string;
  suggestions: HelpSuggestion[];
  loading: boolean;
  /** The help center couldn't be reached, so there's nothing to suggest */
  failed: boolean;
  onPick: (article: HelpArticle) => void;
}

export function HelpSuggestions({
  pageLabel,
  suggestions,
  loading,
  failed,
  onPick,
}: HelpSuggestionsProps) {
  return (
    <Stack gap="md">
      {!failed && (
        // The same heading Analytics gives its page sections
        <H3 className={REVEAL_CLASS_NAME}>Frequently asked questions for {pageLabel}</H3>
      )}
      {failed && (
        <Text leading="snug" size="sm" tone="secondary">
          The help center couldn’t be reached just now.{' '}
          <a
            className="underline underline-offset-2"
            href={HELP_CENTER_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open it in a new tab
          </a>
          .
        </Text>
      )}
      {!failed && (
        <Card className={cn('overflow-hidden p-0', REVEAL_CLASS_NAME)} style={revealAt(1)}>
          {/* Keyed by what it shows, so each change (loading, or a new page's
              questions) cascades in row by row and reads as new */}
          <ol
            key={loading ? 'loading' : suggestions.map(({ article }) => article.id).join()}
            aria-busy={loading}
            aria-label="Questions to search for"
            className="flex flex-col divide-y divide-border-default"
          >
            {(loading ? SUGGESTION_SLOTS : SUGGESTION_SLOTS.slice(0, suggestions.length)).map(
              ({ key, placeholderWidth }, index) => {
                const suggestion = suggestions[index];

                return (
                  <li key={key} className={REVEAL_CLASS_NAME} style={revealAt(index + 1)}>
                    {suggestion ? (
                      // Where it came from is on the row (data-help-source) for
                      // checking tagging, not shown to the user
                      <button
                        aria-keyshortcuts={String(index + 1)}
                        className={cn(
                          SUGGESTION_ROW_CLASS_NAME,
                          'group text-left outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
                        )}
                        data-help-source={suggestion.source}
                        type="button"
                        onClick={() => onPick(suggestion.article)}
                      >
                        <Kbd>{index + 1}</Kbd>
                        <Text
                          as="span"
                          className="transition-colors group-hover:text-text-primary"
                          leading="snug"
                          size="sm"
                          tone="secondary"
                        >
                          {suggestion.article.title}
                        </Text>
                      </button>
                    ) : (
                      <div className={SUGGESTION_ROW_CLASS_NAME} aria-hidden>
                        <Kbd>{index + 1}</Kbd>
                        {/* The zero-width space gives it a title's line height */}
                        <Text
                          as="span"
                          className="flex flex-1 items-center"
                          leading="snug"
                          size="sm"
                        >
                          {'​'}
                          <Skeleton
                            className={cn('h-3.5', placeholderWidth)}
                            containerClassName="flex flex-1"
                          />
                        </Text>
                      </div>
                    )}
                  </li>
                );
              },
            )}
          </ol>
        </Card>
      )}
    </Stack>
  );
}
