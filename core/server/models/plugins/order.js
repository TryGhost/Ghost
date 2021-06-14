const _ = require('lodash');

/**
 * @param {import('bookshelf')} Bookshelf
 */
const orderPlugin = function orderPlugin(Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        orderAttributes() {},
        orderRawQuery() {},

        parseOrderOption: function (orderQueryString, withRelated) {
            const order = {};
            const orderRaw = [];
            const eagerLoadArray = [];

            const orderAttributes = this.orderAttributes();
            if (withRelated && withRelated.indexOf('count.posts') > -1) {
                orderAttributes.push('count.posts');
            }

            let rules = [];
            // CASE: repeat order query parameter keys are present
            if (_.isArray(orderQueryString)) {
                orderQueryString.forEach((qs) => {
                    rules.push(...qs.split(','));
                });
            } else {
                rules = orderQueryString.split(',');
            }

            _.each(rules, (rule) => {
                let match;
                let field;
                let direction;

                match = /^([a-z0-9_.]+)\s+(asc|desc)$/i.exec(rule.trim());

                // invalid order syntax
                if (!match) {
                    return;
                }

                field = match[1].toLowerCase();
                direction = match[2].toUpperCase();

                const orderRawQuery = this.orderRawQuery(field, direction, withRelated);

                if (orderRawQuery) {
                    orderRaw.push(orderRawQuery.orderByRaw);
                    if (orderRawQuery.eagerLoad) {
                        eagerLoadArray.push(orderRawQuery.eagerLoad);
                    }
                    return;
                }

                const matchingOrderAttribute = orderAttributes.find((orderAttribute) => {
                    // NOTE: this logic assumes we use different field names for "parent" and "child" relations.
                    //       E.g.: ['parent.title', 'child.title'] and ['child.title', 'parent.title'] - would not
                    //       distinguish on which relation to sort neither which order to pick the fields on.
                    //       For more context see: https://github.com/TryGhost/Ghost/pull/12226#discussion_r493085098
                    return orderAttribute.endsWith(field);
                });

                if (!matchingOrderAttribute) {
                    return;
                }

                order[matchingOrderAttribute] = direction;
            });

            return {
                order,
                orderRaw: orderRaw.join(', '),
                eagerLoad: _.uniq(eagerLoadArray)
            };
        }
    });
};

module.exports = orderPlugin;
