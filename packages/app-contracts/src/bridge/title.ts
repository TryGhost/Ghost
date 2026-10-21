import { z } from 'zod';

import { isPlainText } from '../plain-text.ts';
import { TITLE_MAX_LENGTH } from './rules.ts';

/**
 * The title of the app's page. Admin shows it as its own title while the page is open, as
 * "{title} · {app name}". Admin only ever sets it as text, but a character that reorders text
 * could still make the app's name read backwards, so a title must follow the same plain-text
 * rule as an app's name. An empty title is allowed: Admin then shows only the app's name.
 */
export const TitleSchema = z
  .string('Expected a title')
  .trim()
  .max(TITLE_MAX_LENGTH, `Expected a title of at most ${TITLE_MAX_LENGTH} characters`)
  .refine(isPlainText, 'Expected a title of plain text on one line');
