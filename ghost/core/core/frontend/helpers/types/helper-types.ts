/* eslint-disable ghost/filenames/match-exported-class */

// Type definitions for Ghost handlebars helpers

export interface HelperOptions {
    hash: Record<string, unknown>;
    data?: Record<string, unknown>;
    fn?: (context: unknown) => string;
    inverse?: (context: unknown) => string;
}

export type SyncHelperFunction = (...args: unknown[]) => unknown;
export type AsyncHelperFunction = (...args: unknown[]) => Promise<unknown>;
export type HelperFunction = SyncHelperFunction | AsyncHelperFunction;
