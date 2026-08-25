export const SYNC_EXPORT_COMPONENTS = [
  'members',
  'analytics',
  'content',
  'themes',
  'routes',
] as const;

// Media assets are only available in the async export as they can be quite large
export const ASYNC_EXPORT_COMPONENTS = [...SYNC_EXPORT_COMPONENTS, 'media'] as const;
