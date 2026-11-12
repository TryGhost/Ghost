import { readFileSync } from 'node:fs';
import path from 'node:path';

const serverRoot = path.resolve(__dirname, '../../core/server');

// Mirrors the template map the Member welcome emails root injects into its renderer.
const TEMPLATE_FILES = {
  baseStyles: 'lib/email-rendering/partials/base-styles.hbs',
  contentStyles: 'lib/email-rendering/partials/content-styles.hbs',
  cardStyles: 'lib/email-rendering/partials/card-styles.hbs',
  emailWrapper: 'lib/email-rendering/partials/email-wrapper.hbs',
  styles: 'services/email-service/email-templates/partials/styles.hbs',
  wrapper: 'services/member-welcome-emails/email-templates/wrapper.hbs',
} as const;

export function readTemplate(name: keyof typeof TEMPLATE_FILES): string {
  return readFileSync(path.join(serverRoot, TEMPLATE_FILES[name]), 'utf8');
}
