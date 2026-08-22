import type {SerializedResponse} from '../types.ts';

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export function deserializeResponse(serialized: SerializedResponse): Response {
    return new Response(NULL_BODY_STATUSES.has(serialized.status) ? null : serialized.body, {
        status: serialized.status,
        statusText: serialized.statusText,
        headers: serialized.headers
    });
}
