export default function getName(actor: {name: unknown, preferredUsername: unknown}): string {
    if (typeof actor.name === 'string') {
        return actor.name;
    }
    if (typeof actor.preferredUsername === 'string') {
        return actor.preferredUsername;
    }
    if (typeof actor.preferredUsername === 'object' && actor.preferredUsername !== null) {
        if ('@value' in actor.preferredUsername) {
            if (typeof actor.preferredUsername['@value'] === 'string') {
                return actor.preferredUsername['@value'];
            }
        }
    }
    return 'Unknown';
}
