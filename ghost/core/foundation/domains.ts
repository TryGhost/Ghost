import { readdirSync } from 'node:fs';
import { discoverDomains, type DomainManifest, type FolderEntry } from '../kernel/domains/discover';

function list(directory: string): FolderEntry[] | undefined {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry): FolderEntry[] => {
      if (entry.isFile()) {
        return [{ name: entry.name, kind: 'file' }];
      }
      return entry.isDirectory() ? [{ name: entry.name, kind: 'folder' }] : [];
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

/**
 * Reads the folder that holds one folder per domain and returns what each
 * contains. This is the reading half of discovery: the kernel works out what
 * the listing means and reads nothing itself.
 *
 * Files are loaded with `require`, without an extension, so the loader the
 * process runs under decides between TypeScript source and built JavaScript.
 */
export function readDomains(root: string): DomainManifest {
  return discoverDomains(root, { list, load: (module) => require(module) });
}
