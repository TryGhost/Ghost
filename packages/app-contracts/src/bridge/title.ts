import { z } from 'zod';

import { isPlainText } from '../plain-text.ts';
import { TITLE_MAX_LENGTH } from './rules.ts';

/**
 * The title of the app's page, which Admin shows as its own while the page is open, as
 * "{title} · {app name}". It is only ever set as text, but a character that reorders text
 * could still make the app's name read backwards, so a title is held to the same plain-text
 * rule as an app's name. An empty title is fine: Admin shows the app's name alone.
 */
export const TitleSchema = z
  .string('Expected a title')
  .trim()
  .max(TITLE_MAX_LENGTH, `Expected a title of at most ${TITLE_MAX_LENGTH} characters`)
  .refine(isPlainText, 'Expected a title of plain text on one line');
