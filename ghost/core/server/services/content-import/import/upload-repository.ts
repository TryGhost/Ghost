import errors from '@tryghost/errors';
import { z } from 'zod';
import {
  MAX_IMPORT_METADATA_BYTES,
  type VersionedImportStorage,
} from '../../../adapters/storage/import-storage';

export const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

const uploadSchema = z.object({
  file: z.object({ key: z.string(), name: z.string() }),
  owner_id: z.string(),
  owner_type: z.enum(['user', 'integration']),
  state: z.enum(['staging', 'ready', 'submitting', 'accepted', 'finished', 'deleting']),
  expires_at: z.iso.datetime().transform((value) => new Date(value)),
  receipt: z.string().nullable(),
});

export type ImportUpload = z.output<typeof uploadSchema>;
export type ImportOwner = { id: string; type: ImportUpload['owner_type'] };
type Change = Partial<Pick<ImportUpload, 'state' | 'receipt'>>;
type Decision<T> = { value: T; change?: Change };

export class ImportUploadRepository {
  private readonly storage: () => VersionedImportStorage;
  private readonly directory: () => string;

  constructor(storage: () => VersionedImportStorage, directory: () => string) {
    this.storage = storage;
    this.directory = directory;
  }

  private key(id: string): string {
    return `${this.directory()}/${id}.json`;
  }

  async create(
    id: string,
    owner: ImportOwner,
    now: Date,
    file: ImportUpload['file'],
  ): Promise<void> {
    const manifest: ImportUpload = {
      file,
      owner_id: owner.id,
      owner_type: owner.type,
      state: 'staging',
      expires_at: new Date(now.getTime() + UPLOAD_TTL_MS),
      receipt: null,
    };
    const bytes = this.encode(manifest);
    // Reserve space for state and receipt changes before publishing the first revision.
    if (bytes.length > MAX_IMPORT_METADATA_BYTES - 128) {
      throw new errors.ValidationError({ message: 'The CSV file name is too long.' });
    }
    if (!(await this.storage().writeVersionedMetadata(this.key(id), bytes, null))) {
      throw new errors.ConflictError({ message: 'This CSV upload already exists.' });
    }
  }

  async get(id: string): Promise<ImportUpload | undefined> {
    const stored = await this.storage().readVersionedMetadata(this.key(id));
    return stored && uploadSchema.parse(JSON.parse(stored.bytes.toString('utf8')));
  }

  async change<T>(
    id: string,
    decide: (upload: ImportUpload | undefined) => Decision<T>,
  ): Promise<T> {
    const storage = this.storage();
    const key = this.key(id);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const stored = await storage.readVersionedMetadata(key);
      const upload = stored && uploadSchema.parse(JSON.parse(stored.bytes.toString('utf8')));
      const { value, change } = decide(upload);
      if (
        !stored ||
        !upload ||
        !change ||
        (await storage.writeVersionedMetadata(
          key,
          this.encode({ ...upload, ...change }),
          stored.version,
        ))
      ) {
        return value;
      }
    }
    throw new errors.ConflictError({
      message: 'Could not update the CSV upload. Please try again.',
    });
  }

  remove(id: string): Promise<void> {
    return this.storage().deleteVersionedMetadata(this.key(id));
  }

  private encode(upload: ImportUpload): Buffer {
    return Buffer.from(JSON.stringify(upload));
  }
}
