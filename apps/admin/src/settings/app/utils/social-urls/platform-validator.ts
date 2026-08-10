import validator from 'validator';

/*
 * Shared engine for social profile URL validation.
 *
 * Every domain-anchored platform (everything except Mastodon, which is
 * federated) runs the same pipeline:
 *
 *   input → URL-or-handle detection → path type match → username formatting
 *         (strip @/trailing slash, percent-decode, NFC-normalise) → username
 *         rule check → canonical URL
 *
 * A platform is described declaratively via SocialPlatformDefinition; the
 * platform files (twitter.ts, linkedin.ts, ...) contain only that definition.
 * Platform facts — which characters a username may contain, which path types
 * exist, whether the canonical URL uses www. — live in the definition. The
 * pipeline itself lives here, once.
 */

export type UsernameRule = {
    /** allow letters/numbers from any script (\p{L}\p{M}\p{N}); default is ASCII alphanumerics only */
    unicode?: boolean;
    /** extra literal characters allowed anywhere in the username, e.g. '._-' */
    extra?: string;
    /** length bounds in unicode code points; defaults 1 and 100 */
    min?: number;
    max?: number;
    /** characters that may not appear at the start or end, e.g. '.' */
    notAtBoundary?: string;
    /** characters that may not repeat consecutively, e.g. '.' rejects 'a..b' */
    notConsecutive?: string;
    /** allow slash-separated trailing segments after the username (LinkedIn /pub/name/12/34/567) */
    nestedSegments?: boolean;
    /** full override: the username is valid if it matches any of these; all other rule fields are ignored */
    patterns?: RegExp[];
};

export type SocialPathType = {
    /** prefix in the canonical URL after the domain, e.g. '@', 'user/', 'in/' or '' */
    urlPrefix: string;
    /** prefix in the stored handle, e.g. '@', 'company/' or '' */
    storagePrefix: string;
    /** extra prefixes recognised in typed handles, e.g. LinkedIn accepts 'in/name' although it stores bare 'name' */
    handleAliases?: string[];
    /**
     * strip a decorative leading '@' even though this prefix already routed
     * the input here (Bluesky's profile/@username). Default false: a leftover
     * '@' after a non-'@' structural prefix (YouTube's user/@x, LinkedIn's
     * company/@x) usually means the input mixed two incompatible URL
     * conventions, so it's left in place for the username rule to reject
     * rather than silently stripped.
     */
    tolerateLeadingAt?: boolean;
    rule: UsernameRule;
};

// SocialPathType with its rule pre-compiled into a callable predicate, built
// once per pathType at createPlatformValidator() construction time. Every
// runtime helper works with this shape so a username check is just
// `pathType.check(username)` — no separate lookup structure to keep in sync.
type CompiledSocialPathType = SocialPathType & {check: (username: string) => boolean};

export type SocialPlatformDefinition = {
    /** accepted domains; the first one is used in the canonical URL */
    domains: string[];
    /** whether the canonical URL uses www. (https://www.tiktok.com vs https://x.com) */
    www: boolean;
    /** regex source for an extra subdomain kept in the canonical URL (LinkedIn regional codes) */
    regionalSubdomain?: string;
    /** path types in priority order; bare handles with no recognised prefix use the first entry */
    pathTypes: SocialPathType[];
    /**
     * capture the whole remaining path — slashes, query string and all — as the
     * handle instead of a single path segment. Facebook needs this for pages/
     * groups/profile.php?id=… URLs; it also disables percent-decoding since the
     * captured value is a path, not a username.
     */
    fullPath?: boolean;
    /** normalise the username after formatting (e.g. lowercase Bluesky DIDs) */
    transformUsername?: (username: string) => string;
    errors: {
        invalidUrl: string;
        invalidUsername: string;
    };
};

export type SocialPlatformValidator = {
    /** normalise any user input (URL or handle) to a canonical profile URL; '' stays '' */
    validate: (input: string) => string;
    /** build the canonical profile URL from a stored handle; throws on invalid handles */
    handleToUrl: (handle: string) => string;
    /** extract the stored handle from a profile URL; null when the URL isn't a valid profile URL */
    urlToHandle: (url: string) => string | null;
};

// characters that need escaping inside a regex character class
const escapeForCharClass = (chars: string) => chars.replace(/[\\\]^-]/g, '\\$&');

// characters that need escaping to appear literally in a regex pattern
const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compileUsernameRule = (rule: UsernameRule) => {
    if (rule.patterns) {
        const patterns = rule.patterns;
        return (username: string) => patterns.some(pattern => pattern.test(username));
    }

    const charset = `a-zA-Z0-9${rule.unicode ? '\\p{L}\\p{M}\\p{N}' : ''}${escapeForCharClass(rule.extra ?? '')}`;
    const charsetRegex = new RegExp(`^[${charset}]+$`, 'u');
    const min = rule.min ?? 1;
    const max = rule.max ?? 100;

    return (username: string) => {
        const [first, ...nested] = rule.nestedSegments ? username.split('/') : [username];

        if (!charsetRegex.test(first)) {
            return false;
        }

        const length = [...first].length; // count code points, not UTF-16 units
        if (length < min || length > max) {
            return false;
        }

        for (const char of rule.notAtBoundary ?? '') {
            if (first.startsWith(char) || first.endsWith(char)) {
                return false;
            }
        }

        for (const char of rule.notConsecutive ?? '') {
            if (first.includes(char + char)) {
                return false;
            }
        }

        // nested segments (LinkedIn /pub/name/12/34/567) only need the charset
        return nested.every(segment => segment === '' || charsetRegex.test(segment));
    };
};

// URLs copied from the browser address bar arrive percent-encoded (é → %C3%A9);
// decode so international usernames validate and are stored in readable form
const decodePercentEncoding = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        // malformed percent sequence — leave as-is for validation to reject
        return value;
    }
};

export const createPlatformValidator = (definition: SocialPlatformDefinition): SocialPlatformValidator => {
    const {domains, www, regionalSubdomain, pathTypes, fullPath, transformUsername, errors} = definition;

    const compiledPathTypes: CompiledSocialPathType[] = pathTypes.map(pathType => ({...pathType, check: compileUsernameRule(pathType.rule)}));

    // longest prefix first so 'channel/' wins over '@' and '' matches last
    const urlPathTypes = [...compiledPathTypes].sort((a, b) => b.urlPrefix.length - a.urlPrefix.length);
    const handlePrefixes = compiledPathTypes
        .flatMap(pathType => [pathType.storagePrefix, ...(pathType.handleAliases ?? [])]
            .filter(prefix => prefix !== '')
            .map(prefix => ({prefix, pathType})))
        .sort((a, b) => b.prefix.length - a.prefix.length);

    const domainPattern = domains.map(domain => escapeForRegex(domain)).join('|');
    // any subdomain labels (www., m., music., mobile., ...) are tolerated and
    // discarded; the platform-specific regional subdomain (LinkedIn's 2-letter
    // country codes) is captured separately since it's kept in the canonical
    // URL rather than discarded. The regional capture is tried first so e.g.
    // 'ca.' on LinkedIn is captured as a region, not swallowed as a generic label.
    const regionalPattern = regionalSubdomain ? `(?:(?<region>${regionalSubdomain})\\.)?` : '';
    const subdomainPattern = `${regionalPattern}(?:[a-zA-Z0-9-]+\\.)*`;
    // [\s\S] instead of . so inputs containing newlines still parse and get
    // rejected by the username rule rather than falling through as "not a URL"
    const urlRegex = new RegExp(
        `^(?:(?:https?:)?\\/\\/)?${subdomainPattern}(?:${domainPattern})\\/(?<rest>[\\s\\S]*)$`,
        'i'
    );
    // matches a bare (protocol-less) domain, with any subdomain, only when
    // it's the whole prefix of the input, not merely a substring anywhere in
    // it — otherwise a handle that happens to contain the domain (e.g. a
    // Bluesky domain-handle like 'mybsky.app') gets misrouted into URL parsing
    // and rejected as malformed
    const bareDomainRegex = new RegExp(`^${subdomainPattern}(?:${domainPattern})(?:\\/|$)`, 'i');

    const isUrlInput = (input: string) => {
        return /^(?:https?:\/\/|\/\/|www\.)/i.test(input) || bareDomainRegex.test(input);
    };

    // trims a leading @, trailing slash, percent-decodes and NFC-normalises so
    // composed and decomposed forms of the same accented character store
    // identically. `atPrefixConsumed` is true whenever a structural prefix
    // was already matched (X's/TikTok's/YouTube's '@' marker, but equally
    // YouTube's user/, LinkedIn's company/, ...) unless that specific path
    // type opts in via tolerateLeadingAt (Bluesky's profile/@username) — in
    // every other such case a leftover leading '@' in rawUsername is
    // illegitimate (e.g. '@@ghost', or 'user/@name' mixing two conventions)
    // and must NOT be stripped, so the username rule rejects it below instead
    // of the pipeline silently "fixing" malformed input.
    const formatUsername = (rawUsername: string, atPrefixConsumed: boolean) => {
        let username = atPrefixConsumed ? rawUsername : rawUsername.replace(/^@/, '');
        username = username.replace(/\/$/, '');
        if (!fullPath) {
            username = decodePercentEncoding(username);
        }
        username = username.normalize('NFC');
        return transformUsername ? transformUsername(username) : username;
    };

    const parseHandle = (input: string) => {
        const cleaned = input.replace(/^\//, '');
        const match = handlePrefixes.find(({prefix}) => cleaned.startsWith(prefix));
        if (match) {
            return {pathType: match.pathType, rawUsername: cleaned.slice(match.prefix.length), atPrefixConsumed: !match.pathType.tolerateLeadingAt};
        }
        return {pathType: compiledPathTypes[0], rawUsername: cleaned, atPrefixConsumed: false};
    };

    const extractParts = (input: string): {region?: string; pathType: CompiledSocialPathType; rawUsername: string; atPrefixConsumed: boolean} => {
        if (!isUrlInput(input)) {
            return parseHandle(input);
        }

        const match = input.match(urlRegex);
        if (!match?.groups) {
            throw new Error(errors.invalidUrl);
        }

        const {region, rest} = match.groups as {region?: string; rest: string};
        const pathType = urlPathTypes.find(candidate => rest.startsWith(candidate.urlPrefix));
        if (!pathType || rest.length <= pathType.urlPrefix.length) {
            throw new Error(errors.invalidUrl);
        }

        const fullRawUsername = rest.slice(pathType.urlPrefix.length);
        // a URL to specific content under a profile (a post, video, reel, ...)
        // still resolves to that profile — take only the first path segment,
        // unless this path type explicitly expects further segments (LinkedIn's
        // pub/name/12/34/567)
        const rawUsername = (!fullPath && !pathType.rule.nestedSegments)
            ? fullRawUsername.split('/')[0]
            : fullRawUsername;
        // a query string or fragment after the username is not part of a profile
        // URL (except in fullPath mode, where e.g. facebook.com/pages/…?ref=ts is fine)
        if (!fullPath && /[?#]/.test(rawUsername)) {
            throw new Error(errors.invalidUsername);
        }

        return {region, pathType, rawUsername, atPrefixConsumed: pathType.urlPrefix !== '' && !pathType.tolerateLeadingAt};
    };

    const checkUsername = (pathType: CompiledSocialPathType, username: string) => {
        if (!pathType.check(username)) {
            throw new Error(errors.invalidUsername);
        }
    };

    const buildUrl = (pathType: CompiledSocialPathType, username: string, region?: string) => {
        const domainPrefix = region ? `${region.toLowerCase()}.` : (www ? 'www.' : '');
        const url = `https://${domainPrefix}${domains[0]}/${pathType.urlPrefix}${username}`;
        if (!validator.isURL(url)) {
            throw new Error(errors.invalidUrl);
        }
        return url;
    };

    const validate = (input: string) => {
        if (!input) {
            return '';
        }
        const {region, pathType, rawUsername, atPrefixConsumed} = extractParts(input.trim());
        const username = formatUsername(rawUsername, atPrefixConsumed);
        checkUsername(pathType, username);
        return buildUrl(pathType, username, region);
    };

    const handleToUrl = (handle: string) => {
        if (!handle) {
            throw new Error(errors.invalidUsername);
        }
        const {pathType, rawUsername, atPrefixConsumed} = parseHandle(handle.trim());
        const username = formatUsername(rawUsername, atPrefixConsumed);
        checkUsername(pathType, username);
        return buildUrl(pathType, username);
    };

    const urlToHandle = (url: string) => {
        if (!url || !isUrlInput(url.trim())) {
            return null;
        }
        try {
            const {pathType, rawUsername, atPrefixConsumed} = extractParts(url.trim());
            const username = formatUsername(rawUsername, atPrefixConsumed);
            checkUsername(pathType, username);
            // the regional subdomain (uk.linkedin.com) is intentionally dropped:
            // stored handles are region-less
            return `${pathType.storagePrefix}${username}`;
        } catch {
            return null;
        }
    };

    return {validate, handleToUrl, urlToHandle};
};
