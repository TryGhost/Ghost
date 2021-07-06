const should = require('should');
const gating = require('../../../../../../../../core/server/api/canary/utils/serializers/output/utils/post-gating');

describe('Unit: canary/utils/serializers/output/utils/post-gating', function () {
    describe('for post', function () {
        it('should NOT hide content attributes when visibility is public', function () {
            const attrs = {
                visibility: 'public',
                plaintext: 'no touching',
                html: '<p>I am here to stay</p>'
            };

            const frame = {
                options: {},
                original: {
                    context: {}
                }
            };

            gating.forPost(attrs, frame);

            attrs.plaintext.should.eql('no touching');
        });

        it('should hide content attributes when visibility is "members"', function () {
            const attrs = {
                visibility: 'members',
                plaintext: 'no touching. secret stuff',
                html: '<p>I am here to stay</p>'
            };

            const frame = {
                options: {},
                original: {
                    context: {}
                }
            };

            gating.forPost(attrs, frame);

            attrs.plaintext.should.eql('');
            attrs.html.should.eql('');
        });

        it('should NOT hide content attributes when visibility is "members" and member is present', function () {
            const attrs = {
                visibility: 'members',
                plaintext: 'I see dead people',
                html: '<p>What\'s the matter?</p>'
            };

            const frame = {
                options: {},
                original: {
                    context: {
                        member: {}
                    }
                }
            };

            gating.forPost(attrs, frame);

            attrs.plaintext.should.eql('I see dead people');
            attrs.html.should.eql('<p>What\'s the matter?</p>');
        });

        it('should hide content attributes when visibility is "paid" and member has status of "free"', function () {
            const attrs = {
                visibility: 'paid',
                plaintext: 'I see dead people',
                html: '<p>What\'s the matter?</p>'
            };

            const frame = {
                options: {},
                original: {
                    context: {
                        member: {
                            status: 'free'
                        }
                    }
                }
            };

            gating.forPost(attrs, frame);

            attrs.plaintext.should.eql('');
            attrs.html.should.eql('');
        });

        it('should NOT hide content attributes when visibility is "paid" and member has status of "paid"', function () {
            const attrs = {
                visibility: 'paid',
                plaintext: 'Secret paid content',
                html: '<p>Can read this</p>'
            };

            const frame = {
                options: {},
                original: {
                    context: {
                        member: {
                            status: 'paid'
                        }
                    }
                }
            };

            gating.forPost(attrs, frame);

            attrs.plaintext.should.eql('Secret paid content');
            attrs.html.should.eql('<p>Can read this</p>');
        });
    });
});
