import {
  Avatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { useBrowseUsers } from '@tryghost/admin-x-framework/api/users';
import { describePresence, presentUsers, userInitials, type PresentUser } from './present-users';
import type { ActivePresence, PresenceResourceType } from './presence-api';

export interface PresenceAvatarsProps {
  active: ActivePresence[];
  /** Names the document in the copy: "has this post open". */
  resourceType: PresenceResourceType;
  /** Avatars shown before the overflow count from the `sm` breakpoint up. */
  limit?: number;
  className?: string;
}

function UserAvatar({
  user,
  label,
  count,
  className,
}: {
  user: PresentUser;
  label: string;
  /** Total people this one avatar stands for; shown as a badge when above one. */
  count?: number;
  className?: string;
}) {
  return (
    <span aria-label={label} className={cn('relative', className)} role="img">
      <Avatar
        className="size-7 border-2 border-background"
        colorSeed={user.name}
        initials={userInitials(user.name)}
        src={user.image ?? undefined}
      />
      {count && count > 1 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-foreground px-1 text-xs leading-none font-medium text-background"
        >
          {count}
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
  resourceType,
  limit = 3,
  className,
}: PresenceAvatarsProps) {
  // The staff list is read only once someone is present, so an empty editor costs no request.
  const { data } = useBrowseUsers({ defaultErrorHandler: false, enabled: active.length > 0 });
  const users = presentUsers(active, data?.users);
  if (users.length === 0) {
    return null;
  }
  const [first] = users;
  const everyone = describePresence(
    users.map((user) => user.name),
    resourceType,
  );
  const shown = users.slice(0, limit);
  const rest = users.length - shown.length;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Inline
            className={cn('pointer-events-auto shrink-0', className)}
            data-testid="presence-avatars"
            gap="none"
            tabIndex={0}
          >
            {users.length > 1 ? (
              <UserAvatar
                className="sm:hidden"
                count={users.length}
                label={everyone}
                user={first}
              />
            ) : null}
            {shown.map((user, index) => (
              <UserAvatar
                key={user.id}
                className={cn(users.length > 1 && 'max-sm:hidden', index > 0 && '-ml-2')}
                label={describePresence([user.name], resourceType)}
                user={user}
              />
            ))}
            {rest > 0 ? (
              <Text aria-hidden="true" className="ml-1.5 max-sm:hidden" size="sm">
                +{rest}
              </Text>
            ) : null}
          </Inline>
        </TooltipTrigger>
        <TooltipContent>{everyone}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
