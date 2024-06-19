function getUsernameFromFollowing(followItem: {username: string; id: string|null;}) {
    if (!followItem.username || !followItem.id) {
        return '@unknown@unknown';
    }
    try {
        return `@${followItem.username}@${(new URL(followItem.id)).hostname}`;
    } catch (err) {
        return '@unknown@unknown';
    }
}

export default getUsernameFromFollowing;
