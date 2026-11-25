import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createStaffEmailTemplateFiles } from '../../core/server/services/staff/email-template-files';

const directory = path.join(__dirname, '../../core/server/services/staff/email-templates');

/** The staff template reader over the real template files, as the root builds it. */
export const staffEmailTemplateFiles = createStaffEmailTemplateFiles({
  readFile: (file) => readFile(path.join(directory, file), 'utf8'),
  readFileSync: (file) => readFileSync(path.join(directory, file), 'utf8'),
});
