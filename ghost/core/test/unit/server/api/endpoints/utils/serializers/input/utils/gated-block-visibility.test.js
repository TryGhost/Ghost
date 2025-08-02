const assert = require('assert/strict');
const {preserveGatedBlockVisibility} = require('../../../../../../../../core/server/api/endpoints/utils/serializers/input/utils/gated-block-visibility');

describe('gated-block-visibility', function () {
    describe('preserveGatedBlockVisibility', function () {
        it('should preserve visibility settings for CTA cards in gated blocks', function () {
            const html = `
                <p>Some content before</p>
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:free"-->
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Free members only CTA</div>
                        <a href="http://example.com" class="kg-cta-button">Click me</a>
                    </div>
                </div>
                <!--kg-gated-block:end-->
                <p>Some content after</p>
            `;

            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Some content before'}]
                        },
                        {
                            type: 'call-to-action',
                            layout: 'minimal',
                            textValue: 'Free members only CTA',
                            buttonText: 'Click me',
                            buttonUrl: 'http://example.com',
                            showButton: true
                        },
                        {
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Some content after'}]
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            };

            const result = preserveGatedBlockVisibility(html, lexicalDoc);

            // Check that the CTA card now has the correct visibility settings
            const ctaCard = result.root.children[1];
            assert.equal(ctaCard.type, 'call-to-action');
            assert.deepEqual(ctaCard.visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });
        });

        it('should not modify cards outside gated blocks', function () {
            const html = `
                <p>Some content before</p>
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Public CTA</div>
                        <a href="http://example.com" class="kg-cta-button">Click me</a>
                    </div>
                </div>
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:free"-->
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Free members only CTA</div>
                        <a href="http://example.com" class="kg-cta-button">Click me</a>
                    </div>
                </div>
                <!--kg-gated-block:end-->
            `;

            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Some content before'}]
                        },
                        {
                            type: 'call-to-action',
                            layout: 'minimal',
                            textValue: 'Public CTA',
                            buttonText: 'Click me',
                            buttonUrl: 'http://example.com',
                            showButton: true
                        },
                        {
                            type: 'call-to-action',
                            layout: 'minimal',
                            textValue: 'Free members only CTA',
                            buttonText: 'Click me',
                            buttonUrl: 'http://example.com',
                            showButton: true
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            };

            const result = preserveGatedBlockVisibility(html, lexicalDoc);

            // First CTA (public) should not have visibility restrictions
            const publicCta = result.root.children[1];
            assert.equal(publicCta.type, 'call-to-action');
            assert.equal(publicCta.visibility, undefined);

            // Second CTA (gated) should have visibility restrictions
            const gatedCta = result.root.children[2];
            assert.equal(gatedCta.type, 'call-to-action');
            assert.deepEqual(gatedCta.visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });
        });

        it('should handle multiple gated blocks with different visibility settings', function () {
            const html = `
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:free"-->
                <div class="kg-card kg-cta-card">Free members CTA</div>
                <!--kg-gated-block:end-->
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:-free"-->
                <div class="kg-card kg-cta-card">Paid members CTA</div>
                <!--kg-gated-block:end-->
            `;

            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'call-to-action',
                            textValue: 'Free members CTA'
                        },
                        {
                            type: 'call-to-action',
                            textValue: 'Paid members CTA'
                        }
                    ],
                    type: 'root'
                }
            };

            const result = preserveGatedBlockVisibility(html, lexicalDoc);

            // First CTA should have free member visibility
            assert.deepEqual(result.root.children[0].visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });

            // Second CTA should have paid member visibility
            assert.deepEqual(result.root.children[1].visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:-free'
                },
                email: {
                    memberSegment: 'status:-free'
                }
            });
        });

        it('should return unmodified document when no gated blocks are present', function () {
            const html = `
                <p>Some content</p>
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Regular CTA</div>
                    </div>
                </div>
            `;

            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Some content'}]
                        },
                        {
                            type: 'call-to-action',
                            textValue: 'Regular CTA'
                        }
                    ],
                    type: 'root'
                }
            };

            const result = preserveGatedBlockVisibility(html, lexicalDoc);

            assert.deepEqual(result, lexicalDoc);
        });

        it('should handle empty or invalid inputs gracefully', function () {
            assert.equal(preserveGatedBlockVisibility('', {}), {});
            assert.equal(preserveGatedBlockVisibility(null, {}), {});
            assert.equal(preserveGatedBlockVisibility('test', null), null);
        });
    });
});