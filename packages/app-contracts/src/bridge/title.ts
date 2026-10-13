import { z } from 'zod';

import { TITLE_MAX_LENGTH } from './rules.ts';

/**
 * The title of the app's page, which Admin shows as its own while the page is open. It is
 * only ever set as text, so it needs no more than a length.
 */
export const TitleSchema = z
  .string('Expected a title')
  .trim()
  .max(TITLE_MAX_LENGTH, `Expected a title of at most ${TITLE_MAX_LENGTH} characters`);
