import errors from '@tryghost/errors';
import {AdvisoryListResponse, type AdvisoryEvent} from './schema';

const DEFAULT_ENDPOINT =
    'https://api.github.com/repos/TryGhost/Ghost/security-advisories';

const USER_AGENT = 'ghost-security-advisories';

export interface FeedOptions {
    endpoint?: string;
    fetchImpl?: typeof fetch;
}

export async function fetchAdvisories(
    options: FeedOptions = {}
): Promise<AdvisoryEvent[]> {
    const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    const fetchImpl = options.fetchImpl ?? fetch;

    const response = await fetchImpl(endpoint, {
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    if (!response.ok) {
        throw new errors.InternalServerError({
            message: `Security advisory fetch failed: ${response.status} ${response.statusText}`
        });
    }

    const raw = await response.json();
    return AdvisoryListResponse.parse(raw);
}
