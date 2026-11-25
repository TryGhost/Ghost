import type { AssetJournal, StoredAsset } from './asset-journal';
import type { PostImportRow } from './row';
import {
  createContentFileHandlers,
  createContentFileImporters,
} from '../../../data/importer/content-files';

type AssetType = 'images' | 'media' | 'files';

export interface PreparedAsset {
  name: string;
  path: string;
  originalPath: string;
  newPath: string;
  targetDir: string;
}

interface AssetHandler {
  type: AssetType;
  extensions: string[];
  loadFile(
    files: Array<{ name: string; path: string }>,
    baseDirectory?: string,
  ): Promise<PreparedAsset[]>;
}

interface AssetImporter {
  type: AssetType;
  doImport(files: PreparedAsset[]): Promise<StoredAsset[]>;
  rollback(files: StoredAsset[]): Promise<void>;
  preProcess(importData: Record<string, unknown>): Record<string, unknown>;
}

interface ArchiveFiles {
  getFiles(directory: string, extensions: string[]): Array<{ name: string; path: string }>;
}

interface PreparedAssetGroup {
  type: AssetType;
  files: PreparedAsset[];
  importer: AssetImporter;
}

export interface AssetPreparationDeps {
  handlers?: AssetHandler[];
  importers?: AssetImporter[];
}

export interface ImportAssetBatch {
  readonly files: PreparedAsset[];
  store(journal: AssetJournal, onStored: () => Promise<void>): Promise<void>;
  isStoredUrl?(url: string): boolean;
  rewriteRows(rows: PostImportRow[]): void;
}

export class PreparedAssetBatch implements ImportAssetBatch {
  private groups: PreparedAssetGroup[];
  private storedUrls = new Set<string>();

  constructor(groups: PreparedAssetGroup[]) {
    this.groups = groups;
  }

  get files(): PreparedAsset[] {
    return this.groups.flatMap((group) => group.files);
  }

  isStoredUrl(url: string): boolean {
    return this.storedUrls.has(url.trim());
  }

  async store(journal: AssetJournal, onStored: () => Promise<void>): Promise<void> {
    const storedByImporter = new Map<AssetImporter, StoredAsset[]>();
    try {
      for (const group of this.groups) {
        const newlyStored: StoredAsset[] = [];
        storedByImporter.set(group.importer, newlyStored);
        for (const file of group.files) {
          const saved = journal.assets.get(file.originalPath);
          if (saved) {
            file.newPath = saved.newPath;
            this.storedUrls.add(saved.newPath);
            continue;
          }
          const [result] = await group.importer.doImport([file]);
          newlyStored.push(result);
          file.newPath = result.stored;
          this.storedUrls.add(result.stored);
          await onStored();
          await journal.append({ ...result, newPath: file.newPath });
        }
      }
      await journal.flush();
    } catch (error) {
      // Persist the failure before rolling back so redelivery cannot use a
      // committed mapping to an asset that this attempt removed.
      await journal.stop(error);
      const failures = [];
      for (const [importer, stored] of storedByImporter) {
        if (!stored.length) {
          continue;
        }
        try {
          await importer.rollback(stored);
        } catch (failure) {
          failures.push(failure);
        }
      }
      if (failures.length) {
        // oxlint-disable-next-line ghost/ghost-custom/ghost-error-usage
        throw new AggregateError(
          [error, ...failures],
          'Asset storage failed and rollback was incomplete.',
          { cause: error },
        );
      }
      throw error;
    }
  }

  rewriteRows(rows: PostImportRow[]): void {
    const importData: Record<string, unknown> = {
      data: { data: { posts: rows, tags: [], users: [] } },
    };

    for (const group of this.groups) {
      importData[group.type] = group.files;
      group.importer.preProcess(importData);
    }
  }
}

export async function prepareAssetBatch(
  archive: ArchiveFiles,
  directory: string,
  baseDirectory?: string,
  deps: AssetPreparationDeps = {},
): Promise<PreparedAssetBatch | undefined> {
  const handlers = deps.handlers ?? (createContentFileHandlers() as AssetHandler[]);
  const importers = deps.importers ?? (createContentFileImporters() as AssetImporter[]);
  const importerByType = new Map(importers.map((importer) => [importer.type, importer]));

  const groups = await Promise.all(
    handlers.map(async (handler): Promise<PreparedAssetGroup | undefined> => {
      const files = archive
        .getFiles(directory, handler.extensions)
        .filter((file) => belongsToAssetDirectory(file.name, handler.type, baseDirectory));
      if (files.length === 0) {
        return;
      }

      const importer = importerByType.get(handler.type);
      if (!importer) {
        return;
      }

      const prepared: PreparedAsset[] = [];
      for (let index = 0; index < files.length; index += 25) {
        prepared.push(...(await handler.loadFile(files.slice(index, index + 25), baseDirectory)));
      }
      return { type: handler.type, files: prepared, importer };
    }),
  );
  const presentGroups = groups.filter((group): group is PreparedAssetGroup => group !== undefined);
  return presentGroups.length > 0 ? new PreparedAssetBatch(presentGroups) : undefined;
}

export function belongsToAssetDirectory(
  fileName: string,
  type: AssetType,
  baseDirectory?: string,
): boolean {
  const parts = fileName.split('/').filter(Boolean);
  if (baseDirectory && parts[0] === baseDirectory) {
    parts.shift();
  }
  if (parts[0] === 'content') {
    parts.shift();
  }

  return parts.length > 1 && parts[0] === type;
}
