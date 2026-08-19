import {nextPaywallCardAccess} from '../../src/utils/paywallCardAccess';

describe('nextPaywallCardAccess', function () {
    // the bug this exists for: a card answered "tiers" kept saying so after the
    // post moved to paid, and getPaywallMemberSegment built its gated block from
    // the stale value - so the rendered post gated a different audience than the
    // post itself did
    it('follows the post when access changes underneath it', function () {
        expect(nextPaywallCardAccess({
            access: 'tiers',
            tiers: ['bronze'],
            visibility: 'paid',
            postTiers: []
        })).toEqual({access: 'paid', tiers: []});
    });

    it('takes the post tiers when the post is tier-gated', function () {
        expect(nextPaywallCardAccess({
            access: 'paid',
            tiers: [],
            visibility: 'tiers',
            postTiers: ['gold', 'silver']
        })).toEqual({access: 'tiers', tiers: ['gold', 'silver']});
    });

    it('answers an unanswered card from the post', function () {
        expect(nextPaywallCardAccess({
            access: null,
            tiers: [],
            visibility: 'members'
        })).toEqual({access: 'members', tiers: []});
    });

    // a paywall in a public post gates nothing, so the host removes the card
    // outright - and a card that survives is left alone rather than reset to
    // asking, since answering writes back to the post and would re-gate it
    it('leaves a card alone when the post is public', function () {
        expect(nextPaywallCardAccess({
            access: 'paid',
            tiers: [],
            visibility: 'public'
        })).toBeNull();
    });

    // returning null is what stops the two-way sync looping: a card edit updates
    // the post, this runs again, sees they agree, and stops
    it('reports no change when the card already matches', function () {
        expect(nextPaywallCardAccess({
            access: 'paid',
            tiers: [],
            visibility: 'paid',
            postTiers: []
        })).toBeNull();
    });

    it('reports no change when the tiers match in a different order', function () {
        expect(nextPaywallCardAccess({
            access: 'tiers',
            tiers: ['silver', 'gold'],
            visibility: 'tiers',
            postTiers: ['gold', 'silver']
        })).toBeNull();
    });

    it('notices a tier being added', function () {
        expect(nextPaywallCardAccess({
            access: 'tiers',
            tiers: ['gold'],
            visibility: 'tiers',
            postTiers: ['gold', 'silver']
        })).toEqual({access: 'tiers', tiers: ['gold', 'silver']});
    });

    it('drops stale tiers when the post stops gating on them', function () {
        expect(nextPaywallCardAccess({
            access: 'tiers',
            tiers: ['gold', 'silver'],
            visibility: 'members',
            postTiers: []
        })).toEqual({access: 'members', tiers: []});
    });

    // nothing to follow yet - the host hasn't supplied a post
    it('does nothing without a visibility', function () {
        expect(nextPaywallCardAccess({
            access: 'paid',
            tiers: [],
            visibility: undefined
        })).toBeNull();
    });
});
