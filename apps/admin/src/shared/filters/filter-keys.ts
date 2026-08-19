/**
 * A filter key is a path, not a piece of text: `custom_fields.value.country` is three steps.
 *
 * Everything that asks a question about a key asks it here, in steps. Asking in characters is
 * what goes wrong — `newsletters.slug` is a prefix of the *text* `newsletters.slugfoo`, but it
 * is not a prefix of its path, and only the second answer is the one anyone means.
 *
 * A namespace may be written with or without its trailing dot; both name the same steps.
 */
function steps(key: string): string[] {
    return key.split('.').filter(Boolean);
}

/** Whether `key` is the namespace itself, or sits somewhere beneath it. */
export function keyIsUnder(key: string, namespace: string): boolean {
    const under = steps(key);
    const above = steps(namespace);

    return above.length <= under.length && above.every((step, index) => step === under[index]);
}

/** What `key` is called beneath `namespace`, or null when it does not sit beneath it. */
export function keyBelow(key: string, namespace: string): string | null {
    if (!keyIsUnder(key, namespace)) {
        return null;
    }

    const rest = steps(key).slice(steps(namespace).length);

    return rest.length ? rest.join('.') : null;
}
