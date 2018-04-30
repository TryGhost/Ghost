/**
 * This is a feature request in knex for 1.0.
 * https://github.com/tgriesser/knex/issues/1641
 */
module.exports = function (bookshelf) {
    const orig1 = bookshelf.transaction;

    bookshelf.transaction = function (cb) {
        return orig1.bind(bookshelf)(function (t) {
            const orig2 = t.commit;
            const orig3 = t.rollback;

            t.commit = function () {
                t.emit('committed', true);
                return orig2.apply(t, arguments);
            };

            t.rollback = function () {
                t.emit('committed', false);
                return orig3.apply(t, arguments);
            };

            return cb(t);
        });
    };
};
