import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

// Vite loads mode-specific dotenv files separately from Nx's task environment.
// Include custom --mode files too, and return only a digest of their contents.
export function hashViteEnv(directory: string): string {
  const files = readdirSync(directory)
    .filter((name) => name === '.env' || name.startsWith('.env.'))
    // stat follows symlinks, as Vite does when loading dotenv files.
    .filter((name) => statSync(join(directory, name), { throwIfNoEntry: false })?.isFile())
    .sort()
    .map((name) => [name, readFileSync(join(directory, name), 'utf8')]);

  return createHash('sha256').update(JSON.stringify(files)).digest('hex');
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { directory: { type: 'string' } } });
  if (!values.directory) {
    throw new Error('--directory is required');
  }
  console.log(hashViteEnv(values.directory));
}
