import { z } from 'zod';

import { AppPathSchema } from './paths.ts';
import { THEME_MODES } from './rules.ts';

/**
 * What Admin tells an app's page when the session starts, and again when it changes.
 *
 * Admin is trusted, so the SDK checks only that the shapes are what it expects, with
 * `isStartContext` and `isTheme`. Unknown fields are dropped rather than refused, so a field a newer Admin adds does not stop an older SDK
 * from starting.
 */

/** The theme Admin is showing, so the page can match it. `mode` is resolved, never `system`. */
export const ThemeSchema = z.object({
  mode: z.enum(THEME_MODES),
  accent_color: z.string(),
});

export type Theme = z.infer<typeof ThemeSchema>;

export const StartContextSchema = z.object({
  site: z.object({
    url: z.string(),
    title: z.string(),
    timezone: z.string(),
    locale: z.string(),
  }),
  // Who is using the app, by ID and role only. Name and email are left out on purpose: an app
  // that needs more about a person asks the API, where permissions apply.
  user: z.object({
    id: z.string(),
    role: z.string(),
  }),
  theme: ThemeSchema,
  // The installation revision this session was started against. Admin ends the session when
  // the installation moves on, so an app never runs against a revision nobody approved.
  session: z.object({
    revision: z.int().nonnegative(),
  }),
  // The app's own route, from Admin's address, so a reload or a shared link lands on the same
  // page. `/` when Admin's address names none.
  path: AppPathSchema,
});

export type StartContext = z.infer<typeof StartContextSchema>;
