import PublishOptions from 'ghost-admin/utils/publish-options';
import {describe, it} from 'mocha';
import {expect} from 'chai';

// the getters only read `post` and `settings`, so the class is built without
// its constructor to keep the store and setup task out of a unit test
const TIERS = [
    {slug: 'gold', name: 'Gold'},
    {slug: 'silver', name: 'Silver'},
    {slug: 'bronze', name: 'Bronze'}
];

function buildPublishOptions({post = {}, settings = {}, recipientFilter, previewFilter, tiers = TIERS} = {}) {
    const publishOptions = Object.create(PublishOptions.prototype);

    publishOptions.post = post;
    publishOptions.availableTiers = tiers;
    publishOptions.settings = Object.assign({
        editorDefaultEmailRecipients: 'visibility',
        editorDefaultEmailRecipientsFilter: null
    }, settings);

    if (recipientFilter !== undefined) {
        publishOptions.selectedRecipientFilter = recipientFilter;
    }

    publishOptions.selectedPreviewFilter = previewFilter;

    return publishOptions;
}

const GATED_POST = {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'};

describe('Unit: Util: publish-options', function () {
    // the full send is unchanged by the preview step - it answers "who would
    // you like to email it to?" exactly as it always has
    describe('defaultRecipientFilter', function () {
        it('emails a paid post to paid members only', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'}
            });

            expect(publishOptions.defaultRecipientFilter).to.equal('status:-free');
        });

        it('emails a tier-gated post to its tiers only', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'tiers', visibilitySegment: 'tier:gold'}
            });

            expect(publishOptions.defaultRecipientFilter).to.equal('tier:gold');
        });

        it('emails a members-only post to everyone', function () {
            const publishOptions = buildPublishOptions({
                post: {visibility: 'members', visibilitySegment: 'status:free,status:-free'}
            });

            expect(publishOptions.defaultRecipientFilter).to.equal('status:free,status:-free');
        });

        it('respects email being turned off entirely', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'},
                settings: {editorDefaultEmailRecipients: 'disabled'}
            });

            expect(publishOptions.defaultRecipientFilter).to.equal(null);
        });
    });

    describe('the preview audience', function () {
        // the author placed a paywall card, which is the opt-in
        it('defaults to free members when a paywall card gates the post', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'}
            });

            expect(publishOptions.previewFilter).to.equal('status:free');
        });

        it('is empty without a paywall card - there is no preview to send', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: false, visibility: 'paid', visibilitySegment: 'status:-free'}
            });

            expect(publishOptions.previewFilter).to.equal(null);
        });

        it('is empty for a members-only post, where every member has access', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'members', visibilitySegment: 'status:free,status:-free'}
            });

            expect(publishOptions.previewFilter).to.equal(null);
        });

        // nothing to preview to if they're already getting the whole post
        it('is empty when the full send already reaches everyone', function () {
            const publishOptions = buildPublishOptions({
                post: GATED_POST,
                recipientFilter: 'status:free,status:-free'
            });

            expect(publishOptions.previewFilter).to.equal(null);
        });

        // this is the drift the two paths used to have: landing on the step
        // gave free members only, while answering "yes" gave free members plus
        // every tier the post skipped. One definition now serves both.
        it('reaches free members and the tiers the full send skipped', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'tiers', visibilitySegment: 'tier:bronze'},
                recipientFilter: 'tier:bronze'
            });

            expect(publishOptions.previewFilter).to.equal('status:free,tier:gold,tier:silver');
        });

        // "paid members" already covers every tier, so naming them too would
        // bring the same people in twice
        it('does not add tiers alongside paid members', function () {
            const publishOptions = buildPublishOptions({
                post: GATED_POST,
                recipientFilter: 'status:free'
            });

            expect(publishOptions.previewFilter).to.equal('status:-free');
        });
    });

    // segment names aren't independent, so overlap has to be reasoned about
    // rather than matched by string
    describe('previewHiddenSegments', function () {
        it('hides paid members when the full send took a tier', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, recipientFilter: 'tier:gold'});

            expect(publishOptions.previewHiddenSegments).to.deep.equal(['tier:gold', 'status:-free']);
        });

        it('keeps the tiers the full send skipped available', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, recipientFilter: 'tier:gold'});

            expect(publishOptions.previewHiddenSegments).to.not.contain('tier:silver');
        });

        it('hides every tier when the full send took paid members', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, recipientFilter: 'status:-free'});

            expect(publishOptions.previewHiddenSegments)
                .to.deep.equal(['status:-free', 'tier:gold', 'tier:silver', 'tier:bronze']);
        });

        // a label may hold anyone, so nothing can be inferred from it
        it('hides a label without inferring anything from it', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, recipientFilter: 'status:free,label:vip'});

            expect(publishOptions.previewHiddenSegments).to.deep.equal(['status:free', 'label:vip']);
        });

        it('keeps an explicit choice over the default', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'},
                previewFilter: 'status:free,label:vip'
            });

            expect(publishOptions.previewFilter).to.equal('status:free,label:vip');
        });
    });

    // the review says the same words the step did, so the naming lives here
    // rather than on either screen
    describe('previewAudienceLabel', function () {
        it('names free members', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, previewFilter: 'status:free'});

            expect(publishOptions.previewAudienceLabel).to.equal('Free members');
        });

        it('names a single tier', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, previewFilter: 'tier:gold'});

            expect(publishOptions.previewAudienceLabel).to.equal('Gold');
        });

        it('counts rather than names a mixed audience', function () {
            const publishOptions = buildPublishOptions({
                post: GATED_POST,
                previewFilter: 'status:free,tier:gold'
            });

            expect(publishOptions.previewAudienceLabel).to.equal('Selected members');
        });

        it('is nothing when no preview is going out', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, previewFilter: null});

            expect(publishOptions.previewAudienceLabel).to.equal(null);
        });
    });

    // two counts, not one - the review states who gets the post and who gets
    // the teaser as separate facts
    describe('the review counts', function () {
        it('scopes each audience to the newsletter separately', function () {
            const publishOptions = buildPublishOptions({
                post: GATED_POST,
                recipientFilter: 'status:-free',
                previewFilter: 'status:free'
            });
            publishOptions.newsletter = {recipientFilter: 'newsletters.status:active'};

            expect(publishOptions.postRecipientFilter).to.equal('newsletters.status:active+(status:-free)');
            expect(publishOptions.previewRecipientFilter).to.equal('newsletters.status:active+(status:free)');
        });

        // NQL binds `+` tighter than `,`, so a multi-part audience has to be
        // parenthesised or the newsletter would only apply to the first part
        it('parenthesises a multi-part audience', function () {
            const publishOptions = buildPublishOptions({
                post: GATED_POST,
                recipientFilter: 'tier:gold,tier:silver'
            });
            publishOptions.newsletter = {recipientFilter: 'newsletters.status:active'};

            expect(publishOptions.postRecipientFilter)
                .to.equal('newsletters.status:active+(tier:gold,tier:silver)');
        });

        it('is null when an audience is empty', function () {
            const publishOptions = buildPublishOptions({post: GATED_POST, previewFilter: null});
            publishOptions.newsletter = {recipientFilter: 'newsletters.status:active'};

            expect(publishOptions.previewRecipientFilter).to.equal(null);
        });
    });

    // what actually gets sent and saved: both audiences as one segment, which
    // is the shape a single recipient picker has always produced
    describe('combinedRecipientFilter', function () {
        it('unions the two audiences', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'},
                recipientFilter: 'status:-free',
                previewFilter: 'status:free'
            });

            expect(publishOptions.combinedRecipientFilter).to.equal('status:-free,status:free');
        });

        it('is just the full send when no preview is going out', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: false, visibility: 'paid', visibilitySegment: 'status:-free'},
                recipientFilter: 'status:-free',
                previewFilter: null
            });

            expect(publishOptions.combinedRecipientFilter).to.equal('status:-free');
        });

        it('does not repeat a segment both audiences name', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: true, visibility: 'paid', visibilitySegment: 'status:-free'},
                recipientFilter: 'status:-free,label:vip',
                previewFilter: 'status:free,label:vip'
            });

            expect(publishOptions.combinedRecipientFilter).to.equal('status:-free,label:vip,status:free');
        });

        it('is null when nobody is being emailed', function () {
            const publishOptions = buildPublishOptions({
                post: {hasPaywallCard: false, visibility: 'paid', visibilitySegment: 'status:-free'},
                recipientFilter: null,
                previewFilter: null
            });

            expect(publishOptions.combinedRecipientFilter).to.equal(null);
        });
    });
});
