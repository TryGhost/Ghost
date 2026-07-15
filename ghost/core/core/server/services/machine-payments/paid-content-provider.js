const models = require('../../models');
const urlService = require('../url');

function isPaidMembersOnlyEntry(entry) {
    if (entry.visibility === 'paid') {
        return true;
    }

    if (entry.visibility !== 'tiers') {
        return false;
    }

    return Array.isArray(entry.tiers) && entry.tiers.length > 0 && entry.tiers.every(tier => tier.type === 'paid');
}

class PaidContentProvider {
    constructor({postModel = models.Post, urlServiceFacade = urlService.facade} = {}) {
        this.postModel = postModel;
        this.urlService = urlServiceFacade;
    }

    async get(resourceType, id) {
        const type = resourceType === 'pages' ? 'page' : 'post';
        const model = await this.postModel.findOne({
            id,
            type,
            status: 'published'
        }, {
            withRelated: ['authors', 'tags', 'tiers']
        });

        if (!model) {
            return null;
        }

        const entry = model.toJSON();

        if (!isPaidMembersOnlyEntry(entry)) {
            return null;
        }

        entry.type = type;
        entry.url = this.urlService.getUrlForResource({
            ...entry,
            type: type === 'page' ? 'pages' : 'posts'
        }, {absolute: true});

        if (!entry.url || entry.url.endsWith('/404/')) {
            return null;
        }

        return entry;
    }
}

module.exports = PaidContentProvider;
module.exports.isPaidMembersOnlyEntry = isPaidMembersOnlyEntry;
