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

                if (orderAttributes.indexOf(field) === -1) {
                    return;
                }

                result[field] = direction;
            });

            return result;
        }
    });
};

module.exports = order;
