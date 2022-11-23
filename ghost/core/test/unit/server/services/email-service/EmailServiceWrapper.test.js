describe('EmailServiceWrapper', function () {
    it('Does not throw', async function () {
        const offersService = require('../../../../../core/server/services/offers');
        await offersService.init();

        const memberService = require('../../../../../core/server/services/members');
        await memberService.init();

        const service = require('../../../../../core/server/services/email-service');
        service.init();
    });
});
