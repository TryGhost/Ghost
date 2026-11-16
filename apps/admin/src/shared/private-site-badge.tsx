import { Badge } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

/** A compact site-status label, also safe to render inside a settings button. */
export function PrivateSiteBadge() {
  return (
    <Badge
      className="h-auto shrink-0 gap-1 border-0 px-1.25 py-px text-2xs leading-3 font-medium shadow-none"
      shape="pill"
      variant="purple"
      asChild
    >
      <span>
        <LucideIcon.Lock aria-hidden="true" className="size-2.5" strokeWidth={2} />
        Private
      </span>
    </Badge>
  );
}
