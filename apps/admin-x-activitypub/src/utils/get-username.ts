function getUsername(actor: {preferredUsername: string; id: string;}) {
    if (!actor.preferredUsername || !actor.id) {
        return '@unknown@unknown';
    }
    try {
        return `@${actor.preferredUsername}@${(new URL(actor.id)).hostname}`;
    } catch (err) {
        return '@unknown@unknown';
    }
}

export default getUsername;
