import {describe, it} from 'mocha';
import {expect} from 'chai';
import {groupTiersByActive} from 'ghost-admin/utils/group-tiers';

describe('Unit: Util: group-tiers', function () {
    it('splits tiers into active and archived groups', function () {
        const tiers = [
            {name: 'Bronze', active: true},
            {name: 'Silver', active: false},
            {name: 'Gold', active: true}
        ];

        const [activeGroup, archivedGroup] = groupTiersByActive(tiers);

        expect(activeGroup.groupName).to.equal('Active tiers');
        expect(activeGroup.options).to.deep.equal([
            {name: 'Bronze', active: true},
            {name: 'Gold', active: true}
        ]);
        expect(archivedGroup.groupName).to.equal('Archived tiers');
        expect(archivedGroup.options).to.deep.equal([
            {name: 'Silver', active: false}
        ]);
    });

    it('maps each tier through the given callback', function () {
        const tiers = [
            {name: 'Bronze', slug: 'bronze', active: true},
            {name: 'Silver', slug: 'silver', active: false}
        ];

        const [activeGroup, archivedGroup] = groupTiersByActive(tiers, tier => ({segment: `tier:${tier.slug}`}));

        expect(activeGroup.options).to.deep.equal([{segment: 'tier:bronze'}]);
        expect(archivedGroup.options).to.deep.equal([{segment: 'tier:silver'}]);
    });

    it('returns empty groups for no tiers', function () {
        const [activeGroup, archivedGroup] = groupTiersByActive([]);

        expect(activeGroup.options).to.deep.equal([]);
        expect(archivedGroup.options).to.deep.equal([]);
    });
});
