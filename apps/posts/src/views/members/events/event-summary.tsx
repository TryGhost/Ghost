import {Link} from '@tryghost/admin-x-framework';
import {ParsedMemberEvent, capitalizeFirstLetter} from './parse-member-event';

/**
 * Renders the textual part of an activity event: action, info, an optional
 * linked object and an optional description (e.g. the clicked URL). Shared
 * between the member detail activity feed and the members activity table.
 */
export function EventSummary({event}: {event: ParsedMemberEvent}) {
    const email = event.email as {subject?: string} | undefined;

    return (
        <div className="min-w-0">
            <span className="text-sm">
                <span>{capitalizeFirstLetter(event.action)}</span>
                {event.info && (
                    <span className="text-muted-foreground"> ({event.info})</span>
                )}
                {event.route && event.object ? (
                    <>
                        <span className="text-muted-foreground"> {event.join} </span>
                        <Link className="font-medium hover:underline" to={event.route}>{event.object}</Link>
                    </>
                ) : event.url && event.object ? (
                    <>
                        <span className="text-muted-foreground"> {event.join} </span>
                        <a className="font-medium hover:underline" href={event.url} rel="noopener noreferrer" target="_blank">{event.object}</a>
                    </>
                ) : email?.subject ? (
                    <>
                        <span className="text-muted-foreground"> {event.join} </span>
                        <span className="font-medium">{email.subject}</span>
                    </>
                ) : null}
            </span>
            {event.description && (
                <div className="truncate text-xs text-muted-foreground" title={event.description}>
                    {event.description}
                </div>
            )}
        </div>
    );
}
