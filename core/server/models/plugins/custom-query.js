/**
 * @param {import('bookshelf')} Bookshelf
 */
const customQueryPlug = function customQueryPlug(Bookshelf) {
    const Model = Bookshelf.Model.extend({
        // override this on the model itself
        customQuery() {},

        applyCustomQuery: function applyCustomQuery(options) {
            this.query((qb) => {
                this.customQuery(qb, options);
            });
        }
    });

    Bookshelf.Model = Model;
};

module.exports = customQueryPlug;
