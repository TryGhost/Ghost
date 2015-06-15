/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */

/**
 * Takes the number of items returned and original options and calculates all of the pagination meta data
 * TODO: Could be moved to either middleware or a bookshelf plugin?
 * @param {Number} totalItems
 * @param {Object} options
 * @returns {Object} pagination
 */
module.exports.paginateResponse = function paginateResponse(totalItems, options) {
    var calcPages = Math.ceil(totalItems / options.limit) || 0,
        pagination = {};

    pagination.page = options.page || 1;
    pagination.limit = options.limit;
    pagination.pages = calcPages === 0 ? 1 : calcPages;
    pagination.total = totalItems;
    pagination.next = null;
    pagination.prev = null;

    if (pagination.pages > 1) {
        if (pagination.page === 1) {
            pagination.next = pagination.page + 1;
        } else if (pagination.page === pagination.pages) {
            pagination.prev = pagination.page - 1;
        } else {
            pagination.next = pagination.page + 1;
            pagination.prev = pagination.page - 1;
        }
    }

    return pagination;
};
