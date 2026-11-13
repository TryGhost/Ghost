// cache-manager 4 and cache-manager-ioredis ship no types. Declares the surface
// the Redis cache adapter uses; extend it here when a caller needs more.
declare module 'cache-manager' {
  export function caching(options: { store: unknown; [option: string]: unknown }): any;
}

declare module 'cache-manager-ioredis' {
  export function create(options: object): unknown;
}
