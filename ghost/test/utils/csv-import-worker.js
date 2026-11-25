const path = require('node:path');
const adapterManager = require('../../core/server/services/adapter-manager').default;
const boot = require('../../core/boot');
const { GhostMailer } = require('../../core/server/lib/mail');
const ContentCSVImporter =
  require('../../core/server/services/content-import/import/importer').default;
const {
  BookshelfPostsRepository,
} = require('../../core/server/services/content-import/import/post-repository');
const contentImport = require('../../core/server/services/content-import');

// Test process only. Keep the real Ghost boot, queue, importer and database.
const [filePath, fileName] = process.argv.slice(2);
let html;
GhostMailer.prototype.send = async (email) => {
  html = email.html;
};

const handle = ContentCSVImporter.prototype.handle;
ContentCSVImporter.prototype.handle = async function (job) {
  if (filePath) {
    const write = BookshelfPostsRepository.prototype.write;
    let writes = 0;
    BookshelfPostsRepository.prototype.write = async function (...args) {
      const result = await write.apply(this, args);
      writes += 1;
      if (writes === 26) {
        process.send({
          type: 'paused',
          importId: job.importId,
          cancellationPath: path.join(
            adapterManager.getAdapter('storage:imports').storagePath,
            path.dirname(job.file.key),
            `cancel-import-${job.importId}`,
          ),
        });
        // The parent kills this worker after the DB commit and before journaling.
        await new Promise(() => {});
      }
      return result;
    };
  }
  await handle.call(this, job);
  process.send({ type: 'finished', importId: job.importId, html });
};

async function run() {
  await boot({ frontend: false, server: false });
  if (filePath) {
    await contentImport.importCSV({ filePath, fileName });
  }
}

run().catch((error) => {
  process.send({ type: 'error', message: error.stack });
  process.exitCode = 1;
});
