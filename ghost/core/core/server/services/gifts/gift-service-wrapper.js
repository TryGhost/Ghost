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
        const staffService = require('../staff');

        const repository = new GiftBookshelfRepository({
            GiftModel
        });

        this.service = new GiftService({
            giftRepository: repository,
            get memberRepository() {
                return membersService.api.members;
            },
            get staffServiceEmails() {
                return staffService.api.emails;
            }
        });
    }
}

module.exports = GiftServiceWrapper;
