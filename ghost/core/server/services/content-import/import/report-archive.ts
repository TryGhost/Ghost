import errors from '@tryghost/errors';
import { z } from 'zod';
import { clearImportPrefix, type ImportStorage } from '../../../adapters/storage/import-storage';
import { readMetadata, type JournalStorage } from './journal';
import { reportFileKey, type ImportReportFile } from './journal-report';
import type { ImportOwner } from './upload-repository';

const REPORT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const ID = /^[a-f0-9]{24}$/;
const reportName = z.enum(['report.csv', 'errors.csv']);
const manifestSchema = z.object({
  ownerId: z.string(),
  expiresAt: z.number(),
  ready: z.boolean(),
  files: z.array(reportName),
});

function unavailable() {
  return new errors.NotFoundError({ message: 'This CSV import report is no longer available.' });
}

export function createReportArchive(getStorage: () => ImportStorage, namespace: () => string) {
  const root = () => `content-csv-import-reports/${namespace()}`;
  const directory = (id: string) => `${root()}/${id}`;

  return {
    async retain(
      id: string,
      ownerId: string,
      files: ImportReportFile[],
      source: Pick<JournalStorage, 'readStream'>,
      now: Date,
    ) {
      const storage = getStorage();
      const prefix = directory(id);
      const key = `${prefix}/manifest.json`;
      const manifest = {
        ownerId,
        expiresAt: now.getTime() + REPORT_LIFETIME_MS,
        files: files.map(({ name }) => name),
        ready: false,
      };
      // Publish a cleanup record before copying. Incomplete files stay private
      // and are eligible for expiry even if the worker stops during the copy.
      await storage.replaceMetadata(key, Buffer.from(JSON.stringify(manifest)));
      for (const { name } of files) {
        const stream = await source.readStream({ path: reportFileKey(name) });
        try {
          await storage.writeStream(`${prefix}/${name}`, stream);
        } finally {
          stream.destroy();
        }
      }
      await storage.replaceMetadata(key, Buffer.from(JSON.stringify({ ...manifest, ready: true })));
    },

    async open(id: string, filename: string, owner: ImportOwner, now: Date) {
      const parsed = reportName.safeParse(filename);
      if (!ID.test(id) || !parsed.success || owner.type !== 'user') {
        throw unavailable();
      }
      const storage = getStorage();
      const prefix = directory(id);
      const metadata = await readMetadata(storage, `${prefix}/manifest.json`);
      const manifest = metadata && manifestSchema.parse(JSON.parse(metadata));
      if (
        !manifest ||
        !manifest.ready ||
        manifest.ownerId !== owner.id ||
        manifest.expiresAt <= now.getTime() ||
        !manifest.files.includes(parsed.data)
      ) {
        throw unavailable();
      }
      return storage.readStream({ path: `${prefix}/${parsed.data}` });
    },

    async expire(now: Date, report: (error: unknown) => void) {
      const storage = getStorage();
      const prefix = root();
      let cursor: string | undefined;
      do {
        const page = await storage.listPrefix(prefix, { cursor });
        for (const key of page.keys) {
          const [id, filename, extra] = key.startsWith(`${prefix}/`)
            ? key.slice(prefix.length + 1).split('/')
            : [];
          if (!ID.test(id ?? '') || filename !== 'manifest.json' || extra !== undefined) {
            continue;
          }
          try {
            const metadata = await readMetadata(storage, key);
            if (metadata && manifestSchema.parse(JSON.parse(metadata)).expiresAt <= now.getTime()) {
              // Keep the manifest until files are gone so a failed deletion can retry.
              await clearImportPrefix(storage, directory(id), key);
            }
          } catch (error) {
            report(error);
          }
        }
        cursor = page.cursor;
      } while (cursor);
    },
  };
}
