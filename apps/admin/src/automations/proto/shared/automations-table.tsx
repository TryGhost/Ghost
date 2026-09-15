import React from 'react';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { Link } from '@tryghost/admin-x-framework';
import { getRunData } from './mock';
import { triggerIcon } from './trigger-config';
import type { ProtoAutomation } from './store';
import { startedLabel } from './member-runs';
import { StatusBadge } from './status-badge';
import { useVersionLink } from './use-version-link';

// The automations list table, shared by every proto concept that models real
// AutomationDetail records (surface, dashboard) — same columns, same run
// metrics (via getRunData), same row shape. Only the link destination
// differs per concept, via `basePath`.

// Last entry, worded by Shade's formatTimestamp like every other timestamp in
// Ghost — "4 hr ago", "Yesterday", then a short date.
//
// This was a hand-rolled ladder with its own vocabulary ("4 hours ago", "2
// minutes ago"), which is what the runs table used to do before it moved to the
// shared formatter. The two then disagreed about the same moment: a run read
// "4 hr ago" in the detail pane and "4 hours ago" in the list.
//
// startedLabel rather than formatTimestamp directly, because fixtures are
// authored against a fixed clock and have to be shifted onto the real one first
// — member-runs owns that shift and exports it for exactly this reason.
const relRunDate = (iso: string | null): string => (iso ? startedLabel(iso) : 'Never');

// Shared grid template so the header and every row line up. Mobile collapses
// to name + status; the entry/count columns appear from `lg` up.
//
// The four data columns are one width, and the name takes whatever is left. They
// used to be 170/130/130/110, sized to their own content — which was invisible
// while every column was left-aligned, and obvious the moment the figures moved
// to the right edge: the gaps between a heading and its own numbers were all
// different, so the block read as drifting rather than as a grid. Equal columns
// put every value the same distance from the one beside it.
//
// The trailing column is the row's overflow menu. It's always in the template,
// even where no menu is passed, so the columns don't shift between a list that can
// act on a row and one that can't.
//
// 72px, not 48: the button is 38px wide (px-2.5 + a size-4 glyph + its border) and
// the cell keeps the same p-4 every other cell has, so the column has to hold both.
// At 48 the button overflowed its own padding and sat flush against the row's right
// edge, touching the hover fill.
const gridCols =
  'grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_130px_130px_130px_130px_72px]';

// text-right + font-mono + text-sm is how every numeric table column in the app
// renders — analytics newsletters, analytics growth, growth sources and post
// analytics all carry this exact string. Numbers that stack down a column are
// read by comparing them, and mono's fixed advance is what lets the digits line
// up to be compared; the headline figures elsewhere stay sans because they're
// read once rather than against each other.
const MetricCell: React.FC<{ value: number }> = ({ value }) => (
  <TableCell
    className={cn(
      'hidden text-right font-mono text-sm lg:block lg:p-4',
      value === 0 && 'text-muted-foreground',
    )}
  >
    {formatNumber(value)}
  </TableCell>
);

const AutomationRow: React.FC<{
  entry: ProtoAutomation;
  basePath: string;
  onArchive?: (entry: ProtoAutomation) => void;
  onDuplicate?: (entry: ProtoAutomation) => void;
  onRename?: (entry: ProtoAutomation) => void;
}> = ({ entry, basePath, onArchive, onDuplicate, onRename }) => {
  const { automation, description, trigger } = entry;
  const toVersioned = useVersionLink();
  const { metrics } = getRunData(automation.id);
  // What starts it, as its own mark. With two automations the names carried the
  // whole distinction; with a flow per tier they're variations on one word, and
  // the thing that actually separates them — how a member gets in — was only
  // readable by opening each one.
  //
  // The generic bolt is the unfinished case: an automation saved before a trigger
  // was chosen can't run, and reads as pending rather than as a fourth kind.
  const TriggerIcon = trigger ? triggerIcon(trigger) : LucideIcon.Zap;

  // The row's actions, written once and rendered into both menus — the ⋯ button and
  // the right-click menu — so the two can't drift into offering different things.
  //
  // `Item` is DropdownMenuItem or ContextMenuItem. Radix gives them the same shape,
  // and onSelect rather than onClick because it's the one that also fires on Enter
  // and Space; onClick leaves a menu row that the keyboard can focus and not use.
  const actions = (Item: React.ElementType) => (
    <>
      {onRename && (
        <Item onSelect={() => onRename(entry)}>
          <LucideIcon.PenLine /> Edit details
        </Item>
      )}
      {/* No dialog. It used to ask for a name first, on the reasoning that creating a
                second automation deserves a deliberate act — but the name it offered was
                always the one you'd accept, so the dialog was a confirmation step wearing
                a form. The posts list duplicates instantly and so does this; the copy is
                named "… (copy)", it's off, and its name is one press away in the row
                above. */}
      {onDuplicate && (
        <Item onSelect={() => onDuplicate(entry)}>
          <LucideIcon.Copy /> Duplicate
        </Item>
      )}
      {/* Archive, where Delete used to be — and not coloured, because it isn't
                destructive. The automation and its history stay; it leaves the list.
                Delete still exists in the store and has no way in from here: see
                setAutomationArchived in shared/store for why it's kept.

                Still last. It's the one that takes the row off the screen you're
                looking at, and a menu opens with the pointer at the top. */}
      {onArchive && (
        <Item onSelect={() => onArchive(entry)}>
          {entry.archived ? (
            <>
              <LucideIcon.ArchiveRestore /> Unarchive
            </>
          ) : (
            <>
              <LucideIcon.Archive /> Archive
            </>
          )}
        </Item>
      )}
    </>
  );
  const hasActions = Boolean(onArchive || onDuplicate || onRename);

  const row = (
    <TableRow
      className={cn(
        'relative w-full cursor-pointer items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0',
        gridCols,
      )}
      data-testid="automation-list-row"
    >
      <TableCell className="static min-w-0 lg:p-4">
        {/* Mark, then the stacked name and description — the members list's own
                    row shape (size-8 mark, gap-3, text beside it), so a table of
                    automations scans the way the other tables in the app do.

                    rounded-md rather than an avatar's circle: this echoes the icon chip
                    on the trigger's node card, which is where the same icon appears
                    once you're inside. */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-8 min-w-8 items-center justify-center rounded-md bg-muted',
              trigger ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <TriggerIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <Link
              className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
              to={toVersioned(`${basePath}/${automation.id}`)}
            >
              <span className="block truncate text-md font-semibold">{automation.name}</span>
            </Link>
            {description && (
              <span className="block truncate text-muted-foreground">{description}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'hidden lg:block lg:p-4',
          !metrics?.last_enrolled_at && 'text-muted-foreground',
        )}
      >
        {relRunDate(metrics?.last_enrolled_at ?? null)}
      </TableCell>
      {/* Total entries is the number the detail page leads with, so the list
                and the automation agree on the headline figure — that's the one people
                cross-check. Completed dropped out to make room: how many are still
                moving matters more at a glance than how many have finished. */}
      <MetricCell value={metrics?.enrollments ?? 0} />
      <MetricCell value={metrics?.in_progress ?? 0} />
      <TableCell className="lg:p-4">
        <StatusBadge archived={entry.archived} status={automation.status} />
      </TableCell>
      {/* Above the row's own click overlay (z-10) or the link would swallow the
                menu, and it stops propagation so opening it doesn't also navigate.

                Always rendered, never revealed on hover. Tags fades its row action in,
                but the rest of the app's lists keep theirs — and an action you can only
                find by hovering is one a keyboard or a touch screen has to guess at.

                Duplicate is what makes this a menu rather than a bare Delete button.
                Building the fourth tier flow from the third is the job this project
                exists to make easier, so it belongs on the row you'd copy — and with
                two items, the destructive one stops being the row's only action. */}
      <TableCell
        className="relative z-20 flex justify-end lg:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {hasActions && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              {/* Bordered, and at the DEFAULT size — 34px, which is what every
                            other outline button in the app measures: --control-height is
                            32px and the border adds one either side. `sm` renders 30 and
                            would sit a notch short of the controls on every neighbouring
                            page.

                            Outline rather than ghost: on a row a border is what says this
                            is a control. Ghost belongs to the canvas, where buttons float
                            on a surface and a border would compete with the cards. */}
              <Button aria-label={`Actions for ${automation.name}`} variant="outline">
                <LucideIcon.MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{actions(DropdownMenuItem)}</DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );

  // Right-click opens the same menu, the way the posts list does. A list you work
  // THROUGH — copying one row to start the next, clearing out the ones that didn't
  // work — is one where the actions want to be under the pointer already, rather
  // than at the end of a trip to the row's right edge.
  //
  // The ⋯ button stays. Right-click is a shortcut for people who know it's there,
  // and it's unreachable from a keyboard or a touch screen; it can't be the only way
  // to any of this.
  //
  // asChild so the trigger IS the <tr> — a wrapper element would be invalid inside
  // tbody. Radix's root renders no DOM of its own and the content portals out, so
  // the table's markup is unchanged. Radix also preventDefaults the native menu,
  // which matters here because the row is covered by a stretched link and the
  // browser would otherwise offer its own "open link in new tab" menu instead.
  if (!hasActions) {
    return row;
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">{actions(ContextMenuItem)}</ContextMenuContent>
    </ContextMenu>
  );
};

interface AutomationsTableProps {
  // Proto records, not bare AutomationDetail: the description shown under each
  // name is editable and lives on the record, not on the API type.
  automations: ProtoAutomation[];
  basePath: string;
  // Report the row's action; the caller owns the confirmation and the write, so
  // one dialog serves the whole list instead of one per row.
  //
  // onArchive covers both directions — the row knows which one it's offering, and a
  // separate onUnarchive would be two props for one write with a boolean in it.
  onArchive?: (entry: ProtoAutomation) => void;
  onDuplicate?: (entry: ProtoAutomation) => void;
  onRename?: (entry: ProtoAutomation) => void;
}

// Column headers + body. `data-testid` stays "automations-list" — callers
// don't need to pass one, it doesn't vary per concept.
export const AutomationsTable: React.FC<AutomationsTableProps> = ({
  automations,
  basePath,
  onArchive,
  onDuplicate,
  onRename,
}) => (
  <Table className="flex flex-col" data-testid="automations-list">
    <TableHeader className="hidden lg:flex lg:flex-col">
      <TableRow
        className={cn('w-full items-center gap-x-4 border-b hover:bg-transparent', gridCols)}
      >
        <TableHead className="lg:px-4">Name</TableHead>
        <TableHead className="lg:px-4">Last entry</TableHead>
        {/* Right-aligned to sit over the right-aligned figures below, the
                    same pairing the analytics tables use. */}
        <TableHead className="text-right lg:px-4">Total entries</TableHead>
        <TableHead className="text-right lg:px-4">In progress</TableHead>
        <TableHead className="lg:px-4">Status</TableHead>
        <TableHead className="lg:px-4" />
      </TableRow>
    </TableHeader>
    <TableBody className="flex flex-col">
      {automations.map((entry) => (
        <AutomationRow
          key={entry.automation.id}
          basePath={basePath}
          entry={entry}
          onArchive={onArchive}
          onDuplicate={onDuplicate}
          onRename={onRename}
        />
      ))}
    </TableBody>
  </Table>
);
