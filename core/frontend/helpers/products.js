// # Products Helper
// Usage: `{{products}}`, `{{products separator=' - '}}`
//
// Returns a string of the products with access to the post.
// By default, products are separated by commas.
const {labs} = require('../services/proxy');
const {SafeString} = require('../services/rendering');

const nql = require('@nexes/nql');
const isString = require('lodash/isString');

function products(options = {}) {
    options = options || {};
    options.hash = options.hash || {};

    const separator = isString(options.hash.separator) ? options.hash.separator : '';
    let output = '';

    let productsList = [];
    if (options.data.product) {
        productsList = [options.data.product];
    }
    if (options.data.products) {
        productsList = options.data.products;
    }
    let accessProductsList = [];

    if (['members', 'paid', 'public'].includes(this.visibility)) {
        accessProductsList = productsList;
    }

    if (this.visibility === 'filter') {
        const nqlFilter = nql(this.visibility_filter);
        accessProductsList = productsList.filter((product) => {
            return nqlFilter.queryJSON({product: product.slug});
        });
    }

    if (accessProductsList.length > 0) {
        const productNames = accessProductsList.map(product => product.name);
        if (accessProductsList.length === 1) {
            output = productNames[0] + ' tier';
        } else {
            if (separator) {
                output = productNames.join(separator) + ' tiers';
            } else {
                const firsts = productNames.slice(0, productNames.length - 1);
                const last = productNames[productNames.length - 1];
                output = firsts.join(', ') + ' and ' + last + ' tiers';
            }
        }
    }

    return new SafeString(output);
}

module.exports = function productsLabsWrapper() {
    let self = this;
    let args = arguments;

    return labs.enabledHelper({
        flagKey: 'multipleProducts',
        flagName: 'Tiers',
        helperName: 'products',
        helpUrl: 'https://ghost.org/docs/themes/'
    }, () => {
        return products.apply(self, args);
    });
};
