// For information on writing migrations, see https://docs.ghost.org/developers/database-migrations

const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const { computeAutoExcerpt, computeReadingTime } = require('../../../../lib/post-meta');

/** Bounded keyset page size — keeps candidate id lists out of unbounded memory. */
const BATCH_SIZE = 500;

/**
 * Resume-safe backfill for posts.auto_excerpt / posts.reading_time.
 *
 * - Null-only: never overwrites values already populated (e.g. Ghost(Pro) pre-run).
 * - Non-transactional + one row at a time: progress survives process kill / timeout.
 * - Keyset batches: ordered id cursor + LIMIT, never materializes every eligible id.
 * - Narrow selects: never load every post's HTML into memory at once.
 * - Down is a no-op: do not un-backfill.
 */
module.exports = createNonTransactionalMigration(
  async function up(knex) {
    let lastId = null;
    let updated = 0;
    let skipped = 0;
    let started = false;

    // eslint-disable-next-line no-restricted-syntax
    while (true) {
      const batchQuery = knex('posts')
        .select('id')
        .where(function () {
          this.where(function () {
            this.whereNull('auto_excerpt')
              .whereNotNull('plaintext')
              .andWhere('plaintext', '!=', '');
          }).orWhere(function () {
            this.whereNull('reading_time').whereNotNull('html').andWhere('html', '!=', '');
          });
        })
        .orderBy('id', 'asc')
        .limit(BATCH_SIZE);

      if (lastId !== null) {
        batchQuery.andWhere('id', '>', lastId);
      }

      const postIdRows = await batchQuery;

      if (!postIdRows.length) {
        break;
      }

      if (!started) {
        // Covers Ghost(Pro) pre-run / previous partial runs that already filled
        // every row we can populate from existing html/plaintext when the first
        // batch is empty (handled below). Otherwise start without a full COUNT.
        logging.info(`Backfilling auto_excerpt/reading_time in keyset batches of ${BATCH_SIZE}`);
        started = true;
      }

      lastId = postIdRows[postIdRows.length - 1].id;

      // eslint-disable-next-line no-restricted-syntax
      for (const { id } of postIdRows) {
        try {
          const [post] = await knex('posts')
            .where({ id })
            .select('id', 'html', 'plaintext', 'feature_image', 'auto_excerpt', 'reading_time');

          if (!post) {
            logging.warn(
              `Post ${id} not found during auto_excerpt/reading_time backfill. Skipping.`,
            );
            skipped += 1;
            continue;
          }

          const updates = {};

          if (post.auto_excerpt === null) {
            const autoExcerpt = computeAutoExcerpt(post.plaintext);
            if (autoExcerpt !== null) {
              updates.auto_excerpt = autoExcerpt;
            }
          }

          if (post.reading_time === null) {
            const readingTime = computeReadingTime(post.html, post.feature_image);
            if (readingTime !== null) {
              updates.reading_time = readingTime;
            }
          }

          if (Object.keys(updates).length === 0) {
            skipped += 1;
            continue;
          }

          // Guard each column with whereNull so a concurrent write-path save
          // that filled the field between read and update is not overwritten.
          let changed = 0;
          // eslint-disable-next-line no-restricted-syntax
          for (const [column, value] of Object.entries(updates)) {
            changed += await knex('posts')
              .where({ id })
              .whereNull(column)
              .update({ [column]: value });
          }

          if (changed > 0) {
            updated += 1;
          } else {
            skipped += 1;
          }
        } catch (err) {
          logging.warn(
            `Failed to backfill auto_excerpt/reading_time for post ${id}: ${err.message}`,
          );
          skipped += 1;
        }
      }
    }

    if (!started) {
      logging.warn('posts auto_excerpt/reading_time already populated, skipping backfill');
      return;
    }

    logging.info(
      `Finished posts auto_excerpt/reading_time backfill (updated=${updated}, skipped=${skipped})`,
    );
  },
  async function down() {
    // no-op: do not un-backfill derived metadata
    logging.warn('Not reversing posts auto_excerpt/reading_time backfill');
  },
);

module.exports.BATCH_SIZE = BATCH_SIZE;
