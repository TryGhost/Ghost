/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _ = require('lodash'),
    tagUpdate,
    trustedDomainUpdate;

tagUpdate = {
    fetchCurrentPost: function fetchCurrentPost(PostModel, id, options) {
        return PostModel.forge({id: id}).fetch(_.extend({}, options, {withRelated: ['tags']}));
    },

    fetchMatchingTags: function fetchMatchingTags(TagModel, tagsToMatch, options) {
        if (_.isEmpty(tagsToMatch)) {
            return false;
        }
        return TagModel.forge()
            .query('whereIn', 'name', _.pluck(tagsToMatch, 'name')).fetchAll(options);
    },

    detachTagFromPost: function detachTagFromPost(post, tag, options) {
        return function () {
            // See tgriesser/bookshelf#294 for an explanation of _.omit(options, 'query')
            return post.tags().detach(tag.id, _.omit(options, 'query'));
        };
    },

    attachTagToPost: function attachTagToPost(post, tag, index, options) {
        return function () {
            // See tgriesser/bookshelf#294 for an explanation of _.omit(options, 'query')
            return post.tags().attach({tag_id: tag.id, sort_order: index}, _.omit(options, 'query'));
        };
    },

    createTagThenAttachTagToPost: function createTagThenAttachTagToPost(TagModel, post, tag, index, options) {
        return function () {
            return TagModel.add({name: tag.name}, options).then(function then(createdTag) {
                return tagUpdate.attachTagToPost(post, createdTag, index, options)();
            });
        };
    },

    updateTagOrderForPost: function updateTagOrderForPost(post, tag, index, options) {
        return function () {
            return post.tags().updatePivot(
                {sort_order: index}, _.extend({}, options, {query: {where: {tag_id: tag.id}}})
            );
        };
    },

    // Test if two tags are the same, checking ID first, and falling back to name
    tagsAreEqual: function tagsAreEqual(tag1, tag2) {
        if (tag1.hasOwnProperty('id') && tag2.hasOwnProperty('id')) {
            return parseInt(tag1.id, 10) === parseInt(tag2.id, 10);
        }
        return tag1.name.toString() === tag2.name.toString();
    },
    tagSetsAreEqual: function tagSetsAreEqual(tags1, tags2) {
        // If the lengths are different, they cannot be the same
        if (tags1.length !== tags2.length) {
            return false;
        }
        // Return if no item is not the same (double negative is horrible)
        return !_.any(tags1, function (tag1, index) {
            return !tagUpdate.tagsAreEqual(tag1, tags2[index]);
        });
    }
};

trustedDomainUpdate = {
    fetchCurrentClient: function fetchCurrentPost(ClientModel, id, options) {
        return ClientModel.forge({id: id}).fetch(_.extend({}, options, {withRelated: ['trustedDomains']}));
    },

    fetchMatchingDomains: function fetchMatchingDomains(DomainModel, domainsToMatch, options) {
        if (_.isEmpty(domainsToMatch)) {
            return false;
        }
        return DomainModel.forge()
            .query('whereIn', 'trusted_domain', _.pluck(domainsToMatch, 'trusted_domain')).fetchAll(options);
    },

    removeDomain: function removeDomain(DomainModel, client, domain, options) {
        return function () {
            return DomainModel.destroy(_.extend({id: domain.id}, options));
        };
    },

    createDomain: function createDomain(DomainModel, client, domain, options) {
        return function () {
            return DomainModel.add({trusted_domain: domain.trusted_domain, client_id: client.id}, options);
        };
    },

    // Test if two domains are the same, checking ID first, and falling back to trusted_domain
    domainsAreEqual: function domainsAreEqual(domain1, domain2) {
        if (domain1.hasOwnProperty('id') && domain2.hasOwnProperty('id')) {
            return parseInt(domain1.id, 10) === parseInt(domain2.id, 10);
        }
        return domain1.trusted_domain.toString() === domain2.trusted_domain.toString();
    },
    domainSetsAreEqual: function domainSetsAreEqual(domains1, domains2) {
        // If the lengths are different, they cannot be the same
        if (domains1.length !== domains2.length) {
            return false;
        }
        // Return if no item is not the same (double negative is horrible)
        return !_.any(domains1, function (domain1, index) {
            return !trustedDomainUpdate.domainsAreEqual(domain1, domains2[index]);
        });
    }
};

module.exports.tagUpdate = tagUpdate;
module.exports.trustedDomainUpdate = trustedDomainUpdate;
