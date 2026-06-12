import moment from 'moment-timezone';
import {EventIcon} from '../../events/event-icon';
import {EventSummary} from '../../events/event-summary';
import {Link} from '@tryghost/admin-x-framework';
import {LoadingIndicator} from '@tryghost/shade/components';
import {parseMemberEvent} from '../../events/parse-member-event';
import {useMemberEvents, useParseEventContext} from '../../events/use-member-events';

function ActivityFeedEmpty() {
    return (
        <div className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="text-sm text-muted-foreground">
                All events related to this member will be shown here.
            </p>
        </div>
    );
}

/**
 * The last five member events plus a link to the full activity screen.
 * Port of the Ember Member::ActivityFeed component.
 */
export function ActivityFeed({memberId}: {memberId?: string}) {
    const isNew = !memberId;
    const parseContext = useParseEventContext();

    const {events, isLoading} = useMemberEvents({
        memberId,
        excludedEvents: ['aggregated_click_event'],
        pageSize: 5,
        enabled: !isNew
    });

    return (
        <section className="mt-8">
            <h4 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Activity</h4>
            <div className="rounded-lg border px-4">
                {isNew || (!isLoading && events.length === 0) ? (
                    <ActivityFeedEmpty />
                ) : isLoading ? (
                    <div className="flex justify-center py-10"><LoadingIndicator size="sm" /></div>
                ) : (
                    <>
                        {events.map((rawEvent) => {
                            const event = parseMemberEvent(rawEvent, parseContext);
                            return (
                                <div key={rawEvent.id ?? event.timestamp} className="flex items-start gap-3 border-b py-3 last:border-b-0">
                                    <EventIcon icon={event.icon} />
                                    <div className="min-w-0 flex-1">
                                        <EventSummary event={event} />
                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                            {moment(event.timestamp).fromNow()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="py-3">
                            <Link
                                className="text-sm font-medium text-green hover:underline"
                                to={`/members-activity?member=${memberId}`}
                            >
                                View all member activity &rarr;
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
