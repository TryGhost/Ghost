import validator from 'validator';

const ERRORS = {
    INVALID_URL: 'The URL must be in a format like https://www.linkedin.com/in/yourUsername',
    INVALID_USERNAME: 'Your Username is not a valid LinkedIn Username'
} as const;

const PATH_TYPES = ['in', 'pub', 'company', 'school'] as const;
type PathType = typeof PATH_TYPES[number];

// validation info: https://www.linkedin.com/help/linkedin/answer/a542685/manage-your-public-profile-url?lang=en
// Alphanumeric, hyphen, 3–100 characters
const USERNAME_REGEX = /^[a-zA-Z0-9-]{3,100}$/;
// For /pub/ profiles: username optionally followed by slash-separated segments (i.e. 12/34/567)
const PUB_USERNAME_REGEX = /^[a-zA-Z0-9-]{3,100}(?:\/[a-zA-Z0-9-]*)*$/;

/* 
* A few parts to this regex:
* - optional protocol & www
* - optional 2-letter regional code (like "ca")
* - LinkedIn domain
* - allowed path type (see PathType)
* - username (captured until a query/hash or string end, so it can contain nested slashes for /pub/)
*/
const LINKEDIN_URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:([a-z]{2})\.)?linkedin\.com\/(in|pub|company|school)\/([^?#]+)/i;

// trims whitespace and removes leading @ if it exists
const formatUsername = (value: string) => value.trim().replace(/^@/, '');

const extractInputParts = (input: string) => {
    // Detect full URL patterns first
    if (/^(https?:\/\/|www\.)/.test(input) || input.includes('linkedin.com')) {
        const match = input.match(LINKEDIN_URL_REGEX);
        if (!match) {
            throw new Error(ERRORS.INVALID_URL);
        }

        // Don't allow anything after the username (e.g. #fragment or ?query)
        if (match[0].length !== input.length) {
            throw new Error(ERRORS.INVALID_USERNAME);
        }

        // don't need protocol from match
        const [, regional, pathType, rawUsername] = match;
        const username = formatUsername(rawUsername);

        // validate regional code is two letters if present
        // validator.js has isISO31661Alpha2, but on a later version than is currently installed
        // so this check isn't as strict, but is sufficient for now
        if (regional && !/^[A-Z]{2}$/.test(regional.toUpperCase())) {
            throw new Error(ERRORS.INVALID_URL);
        }

        return {regional, pathType: pathType as PathType, username};
    }

    // if it's not a url, we expect a handle like name, @name, pub/name, company/name, school/name
    const formatted = formatUsername(input);
    const slashIndex = formatted.indexOf('/');
    if (slashIndex !== -1) {
        const maybeType = formatted.substring(0, slashIndex);
        if ((PATH_TYPES as readonly string[]).includes(maybeType)) {
            return {pathType: maybeType as PathType, username: formatted.substring(slashIndex + 1)};
        }
    }
    return {username: formatted};
};

const isValidUsername = (pathType: PathType, username: string) => {
    const pattern = pathType === 'pub' ? PUB_USERNAME_REGEX : USERNAME_REGEX;
    return pattern.test(username);
};

const buildUrl = ({regional, pathType, username}: {regional?: string; pathType: PathType; username: string}) => {
    const domainPrefix = regional ? `${regional.toLowerCase()}.` : 'www.';
    const url = `https://${domainPrefix}linkedin.com/${pathType}/${username}`;
    if (!validator.isURL(url)) {
        throw new Error(ERRORS.INVALID_URL);
    }
    return url;
};

export function validateLinkedInUrl(input: string) {
    if (!input) {
        return '';
    }

    const {regional, pathType = 'in', username} = extractInputParts(input);

    if (!isValidUsername(pathType, username)) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }

    return buildUrl({regional, pathType, username});
}

export const linkedinHandleToUrl = (handle: string) => {
    if (!handle) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }

    const {regional, pathType = 'in', username} = extractInputParts(handle);

    if (!isValidUsername(pathType, username)) {
        throw new Error(ERRORS.INVALID_USERNAME);
    }

    return buildUrl({regional, pathType, username});
};

export const linkedinUrlToHandle = (url: string) => {
    const match = url.match(LINKEDIN_URL_REGEX);
    if (!match) {
        return null;
    }
    // don't need protocol or subdomain from match
    const [, , pathType, username] = match;
    const formattedUsername = formatUsername(username);
    return pathType === 'in' ? formattedUsername : `${pathType}/${formattedUsername}`;
};
