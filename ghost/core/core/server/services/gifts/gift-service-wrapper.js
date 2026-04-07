class GiftServiceWrapper {
    service;

    async init() {
        if (this.service) {
            return;
        }

        const {Gift: GiftModel} = require('../../models');
        const {GiftBookshelfRepository} = require('./gift-bookshelf-repository');
        const {GiftService} = require('./gift-service');
        const membersService = require('../members');

        const repository = new GiftBookshelfRepository({
            GiftModel
        });

        this.service = new GiftService({
            giftRepository: repository,
            get memberRepository() {
                return membersService.api.members;
            }
        });
    }
}

module.exports = GiftServiceWrapper;
