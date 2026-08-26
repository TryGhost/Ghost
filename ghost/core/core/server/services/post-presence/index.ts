import { PostPresenceService } from './post-presence-service';

// NOTE: this file must contain no export other than the `export =` below.
// esbuild/tsx can't combine `export =` with any additional export statement.
// JS callers `require('.../post-presence')` and expect the singleton instance.

// @ts-expect-error ignore erasableSyntaxOnly here because JS files import this,
// so use export = until those requires can switch to a default export.
export = new PostPresenceService();
