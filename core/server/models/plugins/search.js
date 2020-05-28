const searchPlugin = function searchPlugin(Bookshelf) {
    const Model = Bookshelf.Model.extend({
        // override this on the model itself
        searchQuery() {},

        applySearchQuery: function applySearchQuery(options) {
            if (options.search) {
                this.query((qb) => {
                    this.searchQuery(qb, options.search);
                });
            }
        }
    });

    Bookshelf.Model = Model;
};

module.exports = searchPlugin;
