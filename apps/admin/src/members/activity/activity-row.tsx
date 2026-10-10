import moment from 'moment-timezone';
import { Avatar, TableCell, TableRow } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { Link } from '@tryghost/admin-x-framework';
import { AdminLink } from '@/shared/admin-link';
import { EventIcon } from '@/members/detail/member-activity-feed';
import { isSafeHref } from '@/members/detail/is-safe-href';
import { memberAvatarProps } from '@/members/member-format';
import type { ParsedMemberEvent } from '@/members/detail/member-event';

function emailLabel(email: unknown): string | undefined {
  if (!email || typeof email !== 'object') {
    return undefined;
  }
  const subject = 'subject' in email ? email.subject : undefined;
  if (typeof subject === 'string' && subject.trim()) {
    return subject;
  }
  if ('email' in email && email.email && typeof email.email === 'object') {
    return emailLabel(email.email);
  }
  return 'Email';
}

export default function ActivityRow({
  event,
  memberHref,
  hideMember,
  onPreview,
}: {
  event: ParsedMemberEvent;
  memberHref?: string;
  hideMember: boolean;
  onPreview: (email: unknown) => void;
}) {
  const subject =
    typeof event.subject === 'string' && event.subject ? event.subject : 'Unknown member';
  const memberContent = (
    <Inline gap="md">
      <Avatar
        {...memberAvatarProps(event.member)}
        className="[&_span]:text-[13px]"
        src={event.member?.avatar_image}
      />
      <Stack className="min-w-0" gap="none">
        <span className={cn('truncate font-medium', memberHref && 'group-hover/member:underline')}>
          {subject}
        </span>
        {event.member?.name && (
          <span className="truncate text-muted-foreground">{event.member.email}</span>
        )}
      </Stack>
    </Inline>
  );
  const objectHref = isSafeHref(event.route)
    ? event.route
    : isSafeHref(event.url)
      ? event.url
      : undefined;
  const hasObject = !!event.object && !!objectHref;
  const emailSubject = !hasObject && emailLabel(event.email);
  const action = event.action
    ? event.action[0].toUpperCase() + event.action.slice(1)
    : 'Unknown activity';
  const timestamp = event.timestamp ? moment(event.timestamp).local() : undefined;

  return (
    <TableRow>
      {!hideMember && (
        <TableCell className="group/member w-1/3 max-w-72 min-w-40 py-4">
          {memberHref ? (
            <Link className="block hover:no-underline" to={memberHref}>
              {memberContent}
            </Link>
          ) : (
            memberContent
          )}
        </TableCell>
      )}
      <TableCell className="min-w-48 py-4">
        <Inline gap="md">
          <Inline className="size-8 shrink-0 rounded-full bg-muted" gap="none" justify="center">
            <EventIcon iconName={event.icon} />
          </Inline>
          <Stack className="min-w-0" gap="xs">
            <p className="leading-relaxed">
              <span title={event.actionTitle}>{action}</span>
              {event.info && <span className="ml-1 text-muted-foreground">({event.info})</span>}
              {hasObject && (
                <>
                  <span className="mx-1 text-muted-foreground">{event.join}</span>
                  {objectHref.startsWith('#/') ? (
                    <AdminLink className="font-medium hover:underline" to={objectHref.slice(1)}>
                      {event.object}
                    </AdminLink>
                  ) : (
                    <a
                      className="font-medium hover:underline"
                      href={objectHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {event.object}
                    </a>
                  )}
                </>
              )}
              {emailSubject && (
                <>
                  <span className="mx-1 text-muted-foreground">{event.join}</span>
                  <button
                    className="cursor-pointer text-left font-medium hover:underline"
                    type="button"
                    onClick={() => onPreview(event.email)}
                  >
                    {emailSubject}
                  </button>
                </>
              )}
            </p>
            {event.description && (
              <p className="break-all text-muted-foreground" title={event.description}>
                {event.description}
              </p>
            )}
          </Stack>
        </Inline>
      </TableCell>
      <TableCell className="w-40 py-4 text-left whitespace-nowrap text-muted-foreground">
        {timestamp?.isValid() ? (
          <time dateTime={timestamp.toISOString()}>{timestamp.format('DD MMM YYYY HH:mm')}</time>
        ) : (
          '—'
        )}
      </TableCell>
    </TableRow>
  );
}
