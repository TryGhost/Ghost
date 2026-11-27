import { DEFAULT_UPGRADE_ROUTE } from '@tryghost/admin-x-framework/api/config';
import { z } from 'zod';

const upgradeUrlSchema = z
  .string()
  .min(1)
  .regex(/^(?:#?\/|https?:\/\/)/);
const upgradeConfigSchema = z.looseObject({
  config: z.looseObject({
    hostSettings: z
      .looseObject({
        billing: z.looseObject({ upgradeUrl: upgradeUrlSchema.optional() }).optional(),
      })
      .optional(),
  }),
});

export function upgradeHref(route: string): string {
  return route.startsWith('/') ? `#${route}` : route;
}

export function upgradeHrefFromConfig(data: unknown): string {
  const parsed = upgradeConfigSchema.safeParse(data);
  const configured = parsed.success
    ? parsed.data.config.hostSettings?.billing?.upgradeUrl
    : undefined;
  const route = configured ? configured.replace(/^#/, '') : DEFAULT_UPGRADE_ROUTE;

  return upgradeHref(route);
}
