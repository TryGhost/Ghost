import type { PostImportRow } from './row';

const {
  createContentFileHandlers,
  createContentFileImporters,
} = require('../../../data/importer/content-files');

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
  doImport(files: PreparedAsset[]): Promise<unknown>;
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
  store(): Promise<void>;
  rewriteRows(rows: PostImportRow[]): void;
}

export class PreparedAssetBatch implements ImportAssetBatch {
  private groups: PreparedAssetGroup[];

  constructor(groups: PreparedAssetGroup[]) {
    this.groups = groups;
  }

  get files(): PreparedAsset[] {
    return this.groups.flatMap((group) => group.files);
  }

  async store(): Promise<void> {
    const results = await Promise.allSettled(
      this.groups.map((group) => group.importer.doImport(group.files)),
    );
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) {
      throw failure.reason;
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

      return {
        type: handler.type,
        files: await handler.loadFile(files, baseDirectory),
        importer,
      };
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
