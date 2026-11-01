const DatabaseInfo = require('@tryghost/database-info');

const postEditTransactions = new WeakSet();

// Leave transactions started by callers unchanged. When we start one here,
// keep the post locked while it is being edited. Avoid blocking another post
// from adding authors or tags just because we read this post's authors or tags.
function transaction(ghostBookshelf, callback) {
  if (!DatabaseInfo.isMySQL(ghostBookshelf.knex)) {
    return ghostBookshelf.transaction(callback);
  }

  return ghostBookshelf.knex.transaction(
    (transacting) => {
      postEditTransactions.add(transacting);

      // Match bookshelf-transaction-events: model events run after a successful
      // commit, and rollback discards them. Its wrapper cannot forward Knex's
      // transaction configuration, so configure this transaction directly.
      for (const [method, committed] of [
        ['commit', true],
        ['rollback', false],
      ]) {
        const original = transacting[method];
        transacting[method] = async function (...args) {
          const result = await original.apply(this, args);
          transacting.emit('committed', committed);
          return result;
        };
      }

      return callback(transacting);
    },
    { isolationLevel: 'read committed' },
  );
}

function readAuthor(relation) {
  const sync = relation.sync;
  relation.sync = function (options) {
    if (options?.forUpdate && postEditTransactions.has(options.transacting)) {
      // Neither post membership changes nor revision writes edit user records.
      // The post lock protects membership; READ COMMITTED supplies current
      // data without locking shared users or other posts' pivot records.
      options = { ...options, forUpdate: false, lock: undefined };
    }
    return sync.call(this, options);
  };
  return relation;
}

module.exports = { transaction, readAuthor };
