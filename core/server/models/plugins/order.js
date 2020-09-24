const _ = require('lodash');

const order = function order(Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        orderAttributes() {},

        parseOrderOption: function (orderQueryString, withRelated) {
            let orderAttributes;
            let result;
            let rules;

            orderAttributes = this.orderAttributes();
            if (withRelated && withRelated.indexOf('count.posts') > -1) {
                orderAttributes.push('count.posts');
            }
            result = {};
            rules = orderQueryString.split(',');

            _.each(rules, function (rule) {
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

                result[matchingOrderAttribute] = direction;
            });

            return result;
        }
    });
};

module.exports = order;
