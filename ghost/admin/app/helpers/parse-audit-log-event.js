export default function parseAuditLogEvent(ev) {
    const actorName = getActorName(ev);
    const action = getAction(ev);
    const actionIcon = getActionIcon(ev);

    return {
        actorName,
        actionIcon,
        action,
        original: ev
    };
}

function getActionIcon(ev) {
    switch (ev.event) {
    case 'added':
        return 'add-stroke';
    case 'edited':
        return 'content';
    case 'deleted':
        return 'cross-circle';
    }
}

function getActorName(ev) {
    return ev.actor_id;
}

function getAction(ev) {
    return `${ev.event} ${ev.resource_type}`;
}
