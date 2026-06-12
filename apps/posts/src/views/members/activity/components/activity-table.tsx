import moment from 'moment-timezone';
import {Avatar} from '@tryghost/shade/components';
import {EventIcon} from '../../events/event-icon';
import {EventSummary} from '../../events/event-summary';
import {Link} from '@tryghost/admin-x-framework';
import {parseMemberEvent} from '../../events/parse-member-event';
import type {MemberEvent} from '@tryghost/admin-x-framework/api/members';
import type {ParseEventContext} from '../../events/parse-member-event';

/**
 * The members activity table. Port of the Ember MembersActivity::Table and
 * MembersActivity::TableRow components.
 */
export function ActivityTable({events, hideMemberColumn, parseContext}: {
    events: MemberEvent[];
    hideMemberColumn: boolean;
    parseContext: ParseEventContext;
}) {
    return (
        <table className="w-full border-collapse text-left" data-testid="members-activity-table">
            <thead>
                <tr className="border-b text-sm text-muted-foreground">
                    {!hideMemberColumn && <th className="py-2 pr-4 font-medium">Member</th>}
                    <th className="py-2 pr-4 font-medium">Event</th>
                    <th className="py-2 font-medium">Time</th>
                </tr>
            </thead>
            <tbody>
                {events.map((rawEvent, index) => {
                    const event = parseMemberEvent(rawEvent, parseContext);
                    return (
                        <tr key={rawEvent.id ?? `${event.timestamp}-${index}`} className="border-b last:border-b-0">
                            {!hideMemberColumn && (
                                <td className="max-w-64 py-3 pr-4">
                                    <Link to={event.member?.id ? `/members-activity?member=${event.member.id}` : '/members-activity'}>
                                        <span className="flex items-center gap-3">
                                            <Avatar
                                                className="size-8 min-w-8"
                                                email={event.member?.email ?? undefined}
                                                name={event.member?.name ?? event.member?.email ?? undefined}
                                                src={event.member?.avatar_image ?? undefined}
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-semibold">{event.subject}</span>
                                                {event.member?.name && (
                                                    <span className="block truncate text-xs text-muted-foreground">{event.member?.email}</span>
                                                )}
                                            </span>
                                        </span>
                                    </Link>
                                </td>
                            )}
                            <td className="py-3 pr-4">
                                <div className="flex items-start gap-3">
                                    <EventIcon icon={event.icon} />
                                    <EventSummary event={event} />
                                </div>
                            </td>
                            <td className="py-3 text-sm whitespace-nowrap text-muted-foreground">
                                {moment(event.timestamp).format('DD MMM YYYY HH:mm')}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
