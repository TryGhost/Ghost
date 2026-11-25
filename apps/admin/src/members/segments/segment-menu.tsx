import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverAnchor,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { type ReactNode, useRef, useState } from 'react';
import { useSegmentPins, useSegmentUsage } from './poc-store';
import { DeleteSegmentDialog, RenameSegmentPopoverContent } from './segment-dialogs';

interface SegmentMenuProps {
  segment: Segment;
  /** The button the menu opens from. */
  children: ReactNode;
  /** Items shown before the segment's own, such as a link to its members. */
  leadingItems?: ReactNode;
  onDeleted?: () => void;
}

/**
 * What can be done to a segment: rename it, pin it to the sidebar, delete it. The same menu
 * opens from the members screen while it shows the segment, and from the segment's row in the
 * list of all segments.
 */
export function SegmentMenu({ segment, children, leadingItems, onDeleted }: SegmentMenuProps) {
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);
  const { isPinned, setPinned } = useSegmentPins();
  const { usageOf, isSimulated, setSimulated } = useSegmentUsage();
  const pinned = isPinned(segment.id);
  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialog(null);
    }
  };
  // The menu hands focus back to its button as it closes. Closing to rename, that would take
  // focus from the rename popover, which closes on losing it.
  const renaming = useRef(false);

  return (
    // Rename opens in a popover from the menu's own button.
    <Popover open={dialog === 'rename'} onOpenChange={closeDialog}>
      <DropdownMenu>
        <PopoverAnchor asChild>
          <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        </PopoverAnchor>
        <DropdownMenuContent
          align="end"
          className="min-w-56"
          onCloseAutoFocus={(event) => {
            if (renaming.current) {
              renaming.current = false;
              event.preventDefault();
            }
          }}
        >
          {leadingItems}
          <DropdownMenuItem
            onSelect={() => {
              renaming.current = true;
              setDialog('rename');
            }}
          >
            <LucideIcon.Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPinned(segment.id, !pinned)}>
            {pinned ? (
              <>
                <LucideIcon.PinOff className="size-4" />
                Unpin from sidebar
              </>
            ) : (
              <>
                <LucideIcon.Pin className="size-4" />
                Pin to sidebar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDialog('delete')}
          >
            <LucideIcon.Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
          {/* Prototype only, and marked so, for recordings to leave it out. */}
          <DropdownMenuSeparator data-poc />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground" data-poc>
            Prototype only
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={isSimulated(segment.id)}
            data-poc
            onCheckedChange={(checked) => setSimulated(segment.id, checked)}
          >
            Pretend it is in use
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === 'rename' && (
        <RenameSegmentPopoverContent segment={segment} onClose={() => setDialog(null)} />
      )}
      {dialog === 'delete' && (
        <DeleteSegmentDialog
          segment={segment}
          usage={usageOf(segment.id)}
          open
          onDeleted={onDeleted}
          onOpenChange={closeDialog}
        />
      )}
    </Popover>
  );
}
