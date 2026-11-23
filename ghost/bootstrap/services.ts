import type { AnyServiceDefinition } from '#kernel/define-service';

/** Names a service root without loading it. */
type Named = () => AnyServiceDefinition;

/**
 * The service roots Ghost's application is told about before any is used: those that declare
 * listeners. The application listens for their events from the moment services can be built, and
 * an event builds the service it is for. Each entry names a root and loads nothing until the
 * start sequence registers the list.
 *
 * A root that declares no listeners and no `start` is not listed anywhere: it is built by
 * whatever first uses it.
 */
export const listening: readonly Named[] = [
  () => require('../core/server/services/indexnow-ping').default,
  () => require('../core/server/services/link-redirection').default,
  () => require('../core/server/services/member-welcome-emails').default,
  () => require('../core/server/services/mentions').default,
  () => require('../core/server/services/posts-public').default,
  () => require('../core/server/services/recommendations').default,
  () => require('../core/server/services/slack-ping').default,
  () => require('../core/server/services/staff').default,
  () => require('../core/server/services/tags-public').default,
];

/**
 * The service roots whose `start` is work that no request asks for. The start sequence starts
 * them once Ghost serves.
 */
export const background: readonly Named[] = [
  () => require('../core/server/services/explore-ping').default,
  () => require('../core/server/services/recommendations').default,
];
