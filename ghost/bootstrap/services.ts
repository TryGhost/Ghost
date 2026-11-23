import type { AnyServiceDefinition } from '#kernel/define-service';

/** Names a service root without loading it. */
type Named = () => AnyServiceDefinition;

/**
 * The service roots that react to something that happened: a post was published, a member
 * signed up. The application listens for their events from the moment services can be built,
 * and an event builds the service it is for. Each entry names a root and loads nothing until
 * the start registers the list.
 *
 * Reacting is compatible with several processes: the event is handled once, in the process
 * where it happened, and nothing another process holds depends on it.
 *
 * A root that declares no listeners and no `start` is not listed anywhere: it is built by
 * whatever first uses it.
 */
export const reacting: readonly Named[] = [
  () => require('../core/server/services/indexnow-ping').default,
  () => require('../core/server/services/mentions').default,
  () => require('../core/server/services/recommendations').default,
  () => require('../core/server/services/slack-ping').default,
  () => require('../core/server/services/staff').default,
];

/**
 * EARMARKED. The service roots that listen in order to keep something they hold in memory in
 * step with the site: a response cache, a redirect cache, a loaded language. The event only
 * reaches the process it happened in, so a second process would keep serving what it held.
 *
 * Each leaves this list when what it holds is read through a cache that expires or is shared
 * between processes, and it then declares no listener for it. Do not add to this list.
 */
export const keepingInStep: readonly Named[] = [
  () => require('../core/server/services/link-redirection').default,
  () => require('../core/server/services/member-welcome-emails').default,
  () => require('../core/server/services/posts-public').default,
  () => require('../core/server/services/tags-public').default,
];

/** Every root that declares listeners. */
export const listening: readonly Named[] = [...reacting, ...keepingInStep];

/**
 * The service roots whose `start` is work that no request asks for. The start sequence starts
 * them once Ghost serves.
 */
export const background: readonly Named[] = [
  () => require('../core/server/services/explore-ping').default,
  () => require('../core/server/services/recommendations').default,
];
