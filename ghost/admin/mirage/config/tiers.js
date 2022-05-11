import {paginatedResponse} from '../utils';

export default function mockTiers(server) {
    server.post('/tiers/');

    server.get('/tiers/', paginatedResponse('tiers'));

    server.get('/tiers/:id/', function ({tiers}, {params}) {
        let {id} = params;
        let tier = tiers.find(id);

        return tier || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Tier not found.'
            }]
        });
    });

    server.put('/tiers/:id/', function ({tiers, tierBenefits}, {params}) {
        const attrs = this.normalizedRequestAttrs();
        const tier = tiers.find(params.id);

        const benefitAttrs = attrs.benefits;
        delete attrs.benefits;

        tier.update(attrs);

        benefitAttrs.forEach((benefit) => {
            if (benefit.id) {
                const tierBenefit = tierBenefits.find(benefit.id);
                tierBenefit.tier = tier;
                tierBenefit.save();
            } else {
                tier.createTierBenefit(benefit);
                tier.save();
            }
        });

        return tier.save();
    });

    server.del('/tiers/:id/');
}
