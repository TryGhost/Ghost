import {
  Avatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { PresenceEvent } from './use-presence';

export function PresenceAvatars({
  events,
  currentUserId,
  limit = 3,
}: {
  events: PresenceEvent[];
  currentUserId?: string;
  limit?: number;
}) {
  const users = [
    ...new Map(
      [...events].sort((a, b) => a.ts - b.ts).map((event) => [event.userId, event]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId));
  if (users.length === 0) {
    return null;
  }
  const label = (user: PresenceEvent) =>
    user.userId === currentUserId
      ? `${user.name} is active in another editor session`
      : `${user.name} is active in the editor`;
  return (
    <TooltipProvider>
      <Inline
        aria-label="Active editors"
        className="pointer-events-auto shrink-0"
        data-testid="presence-avatars"
        gap="xs"
      >
        {users.slice(0, limit).map((user) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <span aria-label={label(user)} role="img" tabIndex={0}>
                <Avatar
                  className="size-7"
                  initials={user.name
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                  src={user.avatar ?? undefined}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{label(user)}</TooltipContent>
          </Tooltip>
        ))}
        {users.length > limit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Text
                aria-label={`${users.length - limit} more active ${users.length - limit === 1 ? 'editor' : 'editors'}`}
                size="sm"
                tabIndex={0}
              >
                +{users.length - limit}
              </Text>
            </TooltipTrigger>
            <TooltipContent>
              {users
                .slice(limit)
                .map((user) => user.name)
                .join(', ')}
            </TooltipContent>
          </Tooltip>
        )}
      </Inline>
    </TooltipProvider>
  );
}
