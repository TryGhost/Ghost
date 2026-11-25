import { Badge } from '@tryghost/shade/components';

/**
 * Marks a chosen tier or custom field that has since been archived, beside its name, so a
 * setting that still points at it doesn't look as if it works as before. Says "Archived" unless
 * told otherwise, such as how many of several are.
 */
export function ArchivedBadge({ children = 'Archived' }: { children?: string }) {
  return (
    // A span, as it sits inside buttons and list rows. It never shrinks: a name beside it is cut
    // off first, so the badge always shows.
    <Badge className="shrink-0" variant="secondary" asChild>
      <span>{children}</span>
    </Badge>
  );
}
