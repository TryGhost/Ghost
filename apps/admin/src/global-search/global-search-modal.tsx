import { Fragment, useState } from 'react';
import {
  Badge,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { navigateEmberBillingSubRoute } from '@/ember-bridge';
import { useEmberOwnedRouteMatcher } from '@/routes';
import { getSearchDestination } from './search-destination';
import { searchShortcutLabel } from './search-shortcut';
import type { SearchResult } from './searchables';
import { useGlobalSearch } from './use-global-search';

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits `text` around case-insensitive matches of the whole term. */
function highlightSegments(text: string, term: string) {
  const segments: Array<{ start: number; text: string; match: boolean }> = [];
  let start = 0;

  for (const found of text.matchAll(new RegExp(escapeRegExp(term), 'gi'))) {
    if (found.index > start) {
      segments.push({ start, text: text.slice(start, found.index), match: false });
    }
    segments.push({ start: found.index, text: found[0], match: true });
    start = found.index + found[0].length;
  }

  if (start < text.length) {
    segments.push({ start, text: text.slice(start), match: false });
  }

  return segments;
}

function HighlightedText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) {
    return text;
  }

  return highlightSegments(text, term).map((segment) =>
    segment.match ? (
      <span key={segment.start} className="font-semibold underline">
        {segment.text}
      </span>
    ) : (
      <Fragment key={segment.start}>{segment.text}</Fragment>
    ),
  );
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'bg-pink/10 text-pink' },
  scheduled: { label: 'Scheduled', tone: 'bg-green/10 text-green' },
};

function StatusBadge({ status }: { status?: string }) {
  const badge = status ? STATUS_LABELS[status] : undefined;

  if (!badge) {
    return null;
  }

  return <Badge className={cn('border-transparent', badge.tone)}>{badge.label}</Badge>;
}

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [term, setTerm] = useState('');
  const { results, isLoading } = useGlobalSearch(term);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isEmberOwned = useEmberOwnedRouteMatcher();

  const openResult = (result: SearchResult) => {
    const destination = getSearchDestination(result);
    onOpenChange(false);

    if (!destination) {
      return;
    }

    if (
      destination.billingSubRoute &&
      pathname === destination.path &&
      navigateEmberBillingSubRoute(destination.billingSubRoute)
    ) {
      return;
    }

    navigate(destination.path, { crossApp: isEmberOwned(destination.path) });
  };

  const hasTerm = term.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search site</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search site" value={term} onValueChange={setTerm} />
          <CommandList className="max-h-[50vh]">
            {results.map((group) => (
              <CommandGroup key={group.groupKey ?? group.groupName} heading={group.groupName}>
                {group.options.map((result) => (
                  <CommandItem
                    key={result.id}
                    className="justify-between"
                    value={result.id}
                    onSelect={() => openResult(result)}
                  >
                    <span className="truncate">
                      <HighlightedText term={term} text={result.title} />
                    </span>
                    <StatusBadge status={result.status} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {hasTerm && results.length === 0 && (
              <CommandEmpty>{isLoading ? 'Loading' : 'No results found'}</CommandEmpty>
            )}
          </CommandList>
        </Command>
        <Inline className="border-t border-border px-3 py-2" justify="end">
          <Text size="xs" tone="secondary">
            Open with {searchShortcutLabel}
          </Text>
        </Inline>
      </DialogContent>
    </Dialog>
  );
}
