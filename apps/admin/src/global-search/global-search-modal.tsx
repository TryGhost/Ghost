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
import { cn, useGlobalDirtyState } from '@tryghost/shade/utils';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import type { SearchItem, SearchResultGroup } from './search-source';
import { useGlobalSearch } from './use-global-search';
import { useSettingsReturnToState } from '@/layout/settings-navigation';

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

const optionValue = (group: SearchResultGroup, item: SearchItem) => `${group.id}:${item.id}`;

/** The search itself; rendered inside the dialog so its index queries stop once the dialog closes. */
function GlobalSearchPanel({ onClose }: { onClose: () => void }) {
  const [term, setTerm] = useState('');
  const { results, isLoading } = useGlobalSearch(term);
  // each new set of results selects its first option, so Enter opens it
  const firstValue = results[0] ? optionValue(results[0], results[0].items[0]) : '';
  const [selected, setSelected] = useState({ results, value: firstValue });
  if (selected.results !== results) {
    setSelected({ results, value: firstValue });
  }
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const settingsReturnToState = useSettingsReturnToState();
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const isSettings = /^\/settings(?:\/|$)/.test(pathname);

  const openItem = (item: SearchItem) => {
    if (item.kind === 'action') {
      onClose();
      void item.run();
      return;
    }

    const opensSettings = /^\/settings(?:[/?#]|$)/.test(item.to);
    // Search exits bypass Settings' own controls and its history-only blocker.
    // Keep the search mounted while confirming so Stay preserves the query.
    confirm(isSettings && isDirty && !opensSettings, () => {
      onClose();
      navigate(item.to, {
        state: opensSettings ? settingsReturnToState : undefined,
      });
    });
  };

  const hasTerm = term.trim() !== '';

  return (
    <>
      <Command
        className={cn('sm:rounded-lg', !hasTerm && '[&_[cmdk-input-wrapper]]:border-b-0')}
        shouldFilter={false}
        value={selected.value}
        onValueChange={(value) => setSelected({ results, value })}
      >
        <CommandInput placeholder="Search site" value={term} onValueChange={setTerm} />
        <CommandList className={cn('max-h-[50vh]', !hasTerm && 'hidden')}>
          {results.map((group, index) => (
            <Fragment key={group.id}>
              {index > 0 && <CommandSeparator alwaysRender />}
              <CommandGroup
                className="[&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase"
                heading={group.heading}
              >
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    className="justify-between"
                    value={optionValue(group, item)}
                    onSelect={() => openItem(item)}
                  >
                    <span className="truncate">
                      <HighlightedText term={term} text={item.title} />
                    </span>
                    <StatusBadge status={item.status} />
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
      <DirtyConfirmDialog {...dialogProps} />
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
