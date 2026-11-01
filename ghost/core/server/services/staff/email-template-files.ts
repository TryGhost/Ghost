import { IncorrectUsageError } from '@tryghost/errors';

// Relative to the service's email-templates directory. The renderer can read
// exactly these files: an HTML template per notification and the shared partials.
const TEMPLATES = {
  donation: 'donation.hbs',
  gift: 'gift.hbs',
  'new-free-signup': 'new-free-signup.hbs',
  'new-gift-subscription': 'new-gift-subscription.hbs',
  'new-milestone-received': 'new-milestone-received.hbs',
  'new-paid-cancellation': 'new-paid-cancellation.hbs',
  'new-paid-started': 'new-paid-started.hbs',
  'recommendation-received': 'recommendation-received.hbs',
} as const;

const PARTIALS = {
  preview: 'partials/preview.hbs',
  styles: 'partials/styles.hbs',
} as const;

export type StaffEmailTemplateName = keyof typeof TEMPLATES;

function isTemplateName(name: string): name is StaffEmailTemplateName {
  return Object.hasOwn(TEMPLATES, name);
}

export interface StaffEmailTemplateFiles {
  /** Reads one HTML template; rejects for a name outside the fixed set. */
  readTemplate(name: string): Promise<string>;
  /** Reads every shared partial synchronously, for registration at construction. */
  readPartials(): { name: string; source: string }[];
}

/**
 * Restricts template reads to the fixed staff files. The caller supplies readers
 * scoped to the email-templates directory, so this module performs no I/O itself.
 */
export function createStaffEmailTemplateFiles({
  readFile,
  readFileSync,
}: {
  readFile: (file: string) => Promise<string>;
  readFileSync: (file: string) => string;
}): StaffEmailTemplateFiles {
  return {
    async readTemplate(name) {
      if (!isTemplateName(name)) {
        throw new IncorrectUsageError({
          message: `Unknown staff email template: ${name}`,
        });
      }
      return readFile(TEMPLATES[name]);
    },
    readPartials() {
      return Object.entries(PARTIALS).map(([name, file]) => ({
        name,
        source: readFileSync(file),
      }));
    },
  };
}
