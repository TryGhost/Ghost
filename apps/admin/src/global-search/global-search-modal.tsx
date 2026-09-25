import { Fragment, useState } from 'react';
import {
  Badge,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { navigateEmberBillingSubRoute } from '@/ember-bridge';
import { useEmberOwnedRouteMatcher } from '@/routes';
import { getSearchDestination } from './search-destination';
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
      <mark key={segment.start} className="bg-transparent font-semibold text-inherit underline">
        {segment.text}
      </mark>
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

/** The search itself; rendered inside the dialog so its index queries stop once the dialog closes. */
function GlobalSearchPanel({ onClose }: { onClose: () => void }) {
  const [term, setTerm] = useState('');
  const { results, isLoading } = useGlobalSearch(term);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isEmberOwned = useEmberOwnedRouteMatcher();

  const openResult = (result: SearchResult) => {
    const destination = getSearchDestination(result);
    onClose();

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
    <>
      <Command
        className={cn('sm:rounded-lg', !hasTerm && '[&_[cmdk-input-wrapper]]:border-b-0')}
        shouldFilter={false}
      >
        <CommandInput placeholder="Search site" value={term} onValueChange={setTerm} />
        <CommandList className={cn('max-h-[50vh]', !hasTerm && 'hidden')}>
          {results.map((group, index) => (
            <Fragment key={group.groupKey ?? group.groupName}>
              {index > 0 && <CommandSeparator alwaysRender />}
              <CommandGroup
                className="[&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase"
                heading={group.groupName}
              >
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
            </Fragment>
          ))}
          {hasTerm && results.length === 0 && (
            <CommandEmpty>{isLoading ? 'Loading' : 'No results found'}</CommandEmpty>
          )}
        </CommandList>
      </Command>
      {results.length === 0 && (
        <Text
          className="pointer-events-none absolute top-full right-0 mt-1.5 px-2"
          size="xs"
          weight="semibold"
        >
          Open with Ctrl/⌘ + K
        </Text>
      )}
    </>
  );
}

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="gap-0 p-0">
        <DialogTitle className="sr-only">Search site</DialogTitle>
        <GlobalSearchPanel onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
