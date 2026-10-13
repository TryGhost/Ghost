/**
 * The SDK an app's page uses to talk to Ghost from inside Admin.
 *
 * ```ts
 * import { connect } from '@tryghost/app-sdk';
 *
 * const ghost = await connect();
 * const response = await ghost.fetch('/posts/?limit=5');
 * ```
 */

export { connect } from './connect.ts';
export { GhostAppError, type GhostAppErrorCode } from './errors.ts';
export type {
  ConnectOptions,
  Ghost,
  GhostFetchInit,
  GhostPath,
  JsonBody,
  PathChangeOptions,
  Place,
  Session,
  Site,
  StartContext,
  Theme,
  Unsubscribe,
  User,
} from './types.ts';
