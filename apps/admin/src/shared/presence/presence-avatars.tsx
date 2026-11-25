import { Avatar, Tooltip, TooltipContent, TooltipTrigger } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { describePresence, userInitials, type PresentUser } from './present-users';
import type { ActivePresence, PresenceResourceType } from './presence-api';
import { usePresentUsers } from './use-present-users';

export interface PresenceAvatarsProps {
  active: ActivePresence[];
  /** Includes the current viewer without looking them up in the staff list. */
  currentUser?: PresentUser;
  /** Names the document in the copy: "has this post open". */
  resourceType: PresenceResourceType;
  /** Avatars shown before the overflow count from the `sm` breakpoint up. */
  limit?: number;
  /** Editor viewers are muted while another tab holds editing access. */
  dimmed?: boolean;
  /** Adjacent avatars overlap by default, including pairs. */
  overlap?: boolean;
  /** Override hover timing for a surface; otherwise use the app's tooltip delay. */
  tooltipDelayDuration?: number;
  className?: string;
}

function UserAvatar({
  user,
  label,
  count,
  stack,
  dimmed = false,
  className,
}: {
  user: PresentUser;
  label: string;
  /** Total people this one avatar stands for; shown as a badge when above one. */
  count?: number;
  /** Higher sits on top where avatars overlap. */
  stack?: number;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        'relative',
        // A separate opaque backing keeps overlapping, faded photos from blending together.
        dimmed && 'rounded-full border-2 border-background bg-white',
        className,
      )}
      role="img"
      style={stack === undefined ? undefined : { zIndex: stack }}
    >
      <Avatar
        className={dimmed ? 'size-6 opacity-50' : 'size-7 border-2 border-background'}
        colorSeed={user.name}
        initials={userInitials(user.name)}
        src={user.image ?? undefined}
      />
      {count && count > 1 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-foreground px-1 text-xs leading-none font-medium text-background"
        >
          {formatNumber(count)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The other staff on the given resources. Hovering or focusing the cluster
 * names everyone in one sentence. From `sm` up it is an avatar row with an
 * overflow count; below `sm` a list row has no room, so one avatar with a
 * count badge stands for everyone.
 */
export function PresenceAvatars({
  active,
  currentUser,
  resourceType,
  limit = 3,
  dimmed = false,
  overlap = true,
  tooltipDelayDuration,
  className,
}: PresenceAvatarsProps) {
  const others = usePresentUsers(active);
  const users = currentUser
    ? [currentUser, ...others.filter((user) => user.id !== currentUser.id)]
    : others;
  if (users.length === 0) {
    return null;
  }
  const [first] = users;
  const isViewer = (user: PresentUser) => user.id === currentUser?.id;
  const everyone = describePresence(
    users.filter((user) => !isViewer(user)).map((user) => user.name),
    resourceType,
    { withViewer: currentUser !== undefined },
  );
  const shown = users.slice(0, limit);
  const rest = users.length - shown.length;
  return (
    <Tooltip delayDuration={tooltipDelayDuration}>
      <TooltipTrigger asChild>
        <Inline
          className={cn('pointer-events-auto isolate shrink-0', className)}
          data-testid="presence-avatars"
          gap="none"
          tabIndex={0}
          data-row-secondary
        >
          {users.length > 1 ? (
            <UserAvatar
              className="sm:hidden"
              count={users.length}
              dimmed={dimmed}
              label={everyone}
              user={first}
            />
          ) : null}
          {shown.map((user, index) => (
            <UserAvatar
              key={user.id}
              className={cn(
                users.length > 1 && 'max-sm:hidden',
                index > 0 && (overlap ? '-ml-2' : 'ml-1'),
              )}
              dimmed={dimmed}
              label={describePresence(isViewer(user) ? [] : [user.name], resourceType, {
                withViewer: isViewer(user),
              })}
              // The first avatar overlaps the next, so the row reads left to right.
              stack={shown.length - index}
              user={user}
            />
          ))}
          {rest > 0 ? (
            <Text aria-hidden="true" className="ml-1.5 max-sm:hidden" size="sm">
              +{formatNumber(rest)}
            </Text>
          ) : null}
        </Inline>
      </TooltipTrigger>
      <TooltipContent>{everyone}</TooltipContent>
    </Tooltip>
  );
}
