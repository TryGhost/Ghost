import type {z} from 'zod';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    validationError: 'The following definition "{at}" is invalid: {reason}'
};

const DOCS_URL = 'https://ghost.org/docs/themes/routing/';
const MAX_SHOWN_LENGTH = 40;

export type PathSegment = string | number;

/**
 * Renders the path to the offending value the way an author would find it in
 * their file, e.g. `routes['/about/'].template[1]`.
 */
export function formatLocation(path: readonly PathSegment[]): string {
    if (path.length === 0) {
        return 'routes.yaml';
    }

    return path.reduce<string>((out, segment) => {
        if (typeof segment === 'number') {
            return `${out}[${segment}]`;
        }
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment)) {
            return out ? `${out}.${segment}` : segment;
        }
        return `${out}['${segment.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}']`;
    }, '');
}

/**
 * Names what the author actually wrote, so the error can contrast it with what
 * was expected. Reads as the "but <this> was provided" half of a message.
 */
export function describeValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'nothing';
    }
    if (Array.isArray(value)) {
        return 'a list';
    }
    if (value instanceof Date) {
        return 'a date';
    }
    if (typeof value === 'object') {
        return 'a map';
    }
    if (typeof value === 'string') {
        const shown = value.length > MAX_SHOWN_LENGTH ? `${value.slice(0, MAX_SHOWN_LENGTH)}…` : value;
        return `the text "${shown}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return 'an unsupported value';
}

/**
 * Lists options the way a sentence would, e.g. "posts, pages or tags".
 */
export function humanList(items: readonly string[]): string {
    if (items.length < 2) {
        return items.join('');
    }
    return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/**
 * What each key in routes.yaml accepts, phrased so the message reads
 * "<key> must be <expectation>".
 */
const FIELD_EXPECTATIONS: Record<string, string> = {
    routes: 'a map of route paths (e.g. /about/: about)',
    collections: 'a map of collection paths (e.g. /blog/: {permalink: /{slug}/})',
    taxonomies: 'a map of tag and/or author permalinks (e.g. tag: /tag/{slug}/)',
    controller: 'channel, the only supported controller',
    template: 'a template name, or a list of template names (e.g. template: index)',
    permalink: 'a route with a leading and trailing slash (e.g. permalink: /{slug}/)',
    content_type: 'a content type (e.g. content_type: text/xml)',
    filter: 'a filter string (e.g. filter: featured:true)',
    order: 'an order string (e.g. order: published_at desc)',
    limit: 'a number or "all" (e.g. limit: 5)',
    include: 'a comma-separated string (e.g. include: authors,tags)',
    fields: 'a comma-separated string (e.g. fields: title,slug)',
    visibility: 'a string (e.g. visibility: public)',
    status: 'a string (e.g. status: published)',
    slug: 'a slug (e.g. slug: welcome)',
    page: 'a number (e.g. page: 2)',
    rss: 'true or false',
    redirect: 'true or false'
};

const CONTAINER_EXPECTATIONS: Record<string, {subject: string, expectation: string}> = {
    routes: {subject: 'a route', expectation: 'a template name, or a map of route options (e.g. template, controller, data)'},
    collections: {subject: 'a collection', expectation: 'a map of collection options (e.g. permalink, template, filter)'}
};

/**
 * Keys that accept a list: saying "a list was provided" would contradict the
 * expectation, so the entries are blamed instead.
 */
const LIST_ENTRY_PROBLEMS: Record<string, string> = {
    template: 'one or more of the entries is not a template name'
};

function lookup(table: Record<string, string>, key: PathSegment | undefined): string | undefined {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/**
 * The key a failure belongs to — for a list entry that is the key holding the
 * list, not the index.
 */
function fieldKey(path: readonly PathSegment[]): PathSegment | undefined {
    const last = path[path.length - 1];

    return typeof last === 'number' ? path[path.length - 2] : last;
}

/**
 * Resolves the "<subject> must be <expectation>" half of a message for the
 * value at `path`. Returns null when the key is unknown, in which case the
 * caller falls back to the underlying schema message.
 */
function describeExpectation(path: readonly PathSegment[]): {subject: string, expectation: string} | null {
    if (path.length === 0) {
        return {subject: 'the file', expectation: 'a map of routes, collections or taxonomies'};
    }

    const [section] = path;

    // A whole section, e.g. `routes: hello`
    if (path.length === 1) {
        const expectation = lookup(FIELD_EXPECTATIONS, section);
        return expectation ? {subject: String(section), expectation} : null;
    }

    // A single route or collection, e.g. `routes: {/about/: [a, b]}`
    if (path.length === 2 && typeof section === 'string' && Object.prototype.hasOwnProperty.call(CONTAINER_EXPECTATIONS, section)) {
        return CONTAINER_EXPECTATIONS[section];
    }

    // A taxonomy permalink, e.g. `taxonomies: {tag: 5}`
    if (path.length === 2 && section === 'taxonomies') {
        return {subject: `the ${String(path[1])} taxonomy`, expectation: `a permalink route (e.g. ${String(path[1])}: /${String(path[1])}/{slug}/)`};
    }

    const expectation = lookup(FIELD_EXPECTATIONS, fieldKey(path));

    return expectation ? {subject: String(fieldKey(path)), expectation} : null;
}

function valueAtPath(value: unknown, path: readonly PathSegment[]): unknown {
    return path.reduce<unknown>((current, segment) => {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        return (current as Record<PathSegment, unknown>)[segment];
    }, value);
}

export function validationError(at: string, reason: string, help?: string): errors.ValidationError {
    return new errors.ValidationError({
        message: tpl(messages.validationError, {at, reason}),
        ...(help ? {help} : {})
    });
}

/**
 * Turns a schema failure into an error that names the exact key in routes.yaml
 * and says what that key accepts — schema messages on their own only say
 * things like "Invalid input: expected string, received number".
 *
 * @param error  the schema failure
 * @param basePath path of the value that was handed to the schema
 * @param value  that same value, used to describe what the author wrote
 */
export function toValidationError(error: z.ZodError, basePath: readonly PathSegment[] = [], value?: unknown): errors.ValidationError {
    const issue = error.issues[0];
    const issuePath = issue.path as PathSegment[];
    const path = [...basePath, ...issuePath];

    const expectation = describeExpectation(path);
    if (!expectation) {
        return validationError(formatLocation(path), issue.message, DOCS_URL);
    }

    const provided = valueAtPath(value, issuePath);
    const listProblem = Array.isArray(provided) ? lookup(LIST_ENTRY_PROBLEMS, fieldKey(path)) : undefined;
    const found = listProblem ?? `${describeValue(provided)} was provided`;

    return validationError(formatLocation(path), `${expectation.subject} must be ${expectation.expectation}, but ${found}.`, DOCS_URL);
}
