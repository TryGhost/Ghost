export interface RedirectConfig {
    from: string;
    /** Capture groups from `from` can be referenced as `$1`, `$2`, etc. */
    to: string;
    /** `true` → HTTP 301, otherwise HTTP 302. */
    permanent?: boolean;
}

/**
 * Concurrent `replaceAll` calls have no ordering guarantee — serialize
 * externally if that matters.
 */
export interface RedirectsStore {
    getAll(): Promise<RedirectConfig[]>;
    replaceAll(redirects: RedirectConfig[]): Promise<void>;
}
