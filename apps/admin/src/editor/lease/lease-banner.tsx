import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { editorLeaseBanner } from '@tryghost/test-data/selectors/editor';
import type { ActivePresence, PresenceResourceType } from '@/shared/presence/presence-api';
import { usePresentUsers } from '@/shared/presence/use-present-users';
import type { EditLease } from './use-edit-lease';

const NOBODY: ActivePresence[] = [];

export interface LeaseBannerProps {
  lease: EditLease;
  resourceId: string | null;
  resourceType: PresenceResourceType;
  onTakeOver: () => void;
}

/**
 * Says why the editor is read-only and offers the way to edit: who holds the
 * document, that another of the writer's own tabs does, or that a takeover is
 * under way. Nothing is shown while the answer is still on its way.
 */
export function LeaseBanner({ lease, resourceId, resourceType, onTakeOver }: LeaseBannerProps) {
  const held = lease.locked && lease.reason === 'held' ? lease : null;
  const other = held && !held.ownTab && resourceId ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );
  if (!lease.locked || lease.reason === 'pending') {
    return null;
  }

  const who = holder?.name ?? 'Someone else';
  const message =
    lease.reason === 'taking'
      ? `Taking over this ${resourceType}…`
      : lease.ownTab
        ? `This ${resourceType} is being edited in another of your tabs.`
        : lease.lost
          ? `${who} took over editing this ${resourceType}.`
          : `${who} is editing this ${resourceType}.`;

  return (
    <Banner
      className="mx-4 mt-3 shrink-0"
      data-testid={editorLeaseBanner}
      role="status"
      size="sm"
      variant="info"
    >
      <Inline align="center" gap="sm">
        <Text>{message}</Text>
        {lease.reason === 'held' ? (
          <Button size="sm" variant="outline" onClick={onTakeOver}>
            {lease.ownTab ? 'Edit here' : 'Take over'}
          </Button>
        ) : null}
      </Inline>
    </Banner>
  );
}
