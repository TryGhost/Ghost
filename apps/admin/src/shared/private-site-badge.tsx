import { Badge } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

/** A compact site-status label, also safe to render inside a settings button. */
export function PrivateSiteBadge() {
  return (
    <Badge
      className="h-4 shrink-0 gap-0.5 bg-state-warning-fill px-1.5 text-xs leading-none font-medium text-state-warning-foreground shadow-none"
      shape="pill"
      variant="secondary"
      asChild
    >
      <span>
        <LucideIcon.Lock aria-hidden="true" className="size-2.5" strokeWidth={2} />
        Private
      </span>
    </Badge>
  );
}
