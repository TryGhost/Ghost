/**
 * Public surface of the tags domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx and the tag detail gate). Everything else in
 * this domain is internal.
 */

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`/`lazy()`, so static re-exports would pull the chunks into the
// shell bundle.
export const lazyTagsScreen = () => import('./tags');
export const lazyTagDetailScreen = () => import('./detail/tag-detail');
