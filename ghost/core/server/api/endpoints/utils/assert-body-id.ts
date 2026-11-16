import errors from '@tryghost/errors';

/**
 * Rejects an edit whose body names a different resource than the URL. Schemas strip
 * the body id, so this reads the original request body.
 */
export function assertBodyIdMatches(
  body: Record<string, unknown> | undefined,
  docName: string,
  id: string,
) {
  const resources = body?.[docName];
  const resource: unknown = Array.isArray(resources) ? resources[0] : undefined;
  if (
    resource &&
    typeof resource === 'object' &&
    'id' in resource &&
    resource.id &&
    resource.id !== id
  ) {
    throw new errors.ValidationError({
      message: 'Invalid id provided.',
      property: `body.${docName}.0.id`,
    });
  }
}
