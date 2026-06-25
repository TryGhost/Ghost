import type {RequestContext} from '../../../services/actions';

interface FrameLike {
    options: {
        context?: unknown;
    };
}

// Integration wins over user: an integration request also carries the owning user, so checking user
// first would misattribute the action.
export function requestContextFromFrame(frame: FrameLike): RequestContext {
    const context = (frame.options.context ?? {}) as {user?: string; integration?: {id: string}};
    if (context.integration) {
        return {actor: {id: context.integration.id, type: 'integration'}};
    }
    if (context.user) {
        return {actor: {id: context.user, type: 'user'}};
    }
    return {actor: null};
}
