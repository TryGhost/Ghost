function getHandle(actor: {handle?: string; preferredUsername: string; id: string|null;}) {
    if (actor.handle) {
        return actor.handle;
    }

    if (!actor.preferredUsername || !actor.id) {
        return '@unknown@unknown';
    }
    try {
        return `@${actor.preferredUsername}@${(new URL(actor.id)).hostname.replace(/^www\./, '')}`;
    } catch {
        return '@unknown@unknown';
    }
}

export default getHandle;
