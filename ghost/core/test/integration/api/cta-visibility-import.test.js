const assert = require('assert/strict');
const testUtils = require('../../utils');
const {preserveGatedBlockVisibility} = require('../../../core/server/api/endpoints/utils/serializers/input/utils/gated-block-visibility');

describe('CTA Card Visibility Import', function () {
    before(function () {
        testUtils.integrationTesting.initGhost();
    });

    describe('preserveGatedBlockVisibility function', function () {
        it('should preserve CTA card visibility when importing HTML with gated blocks', function () {
            // This is the HTML structure that would be sent to the Admin API
            const htmlWithGatedCTA = `
                <p>Some content before the CTA</p>
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:free"-->
                <div class="kg-card kg-cta-card kg-cta-bg-white kg-cta-minimal kg-cta-has-img" data-layout="minimal">
                    <div class="kg-cta-content">
                        <div class="kg-cta-image-container">
                            <img src="https://example.com/image.jpg" alt="CTA Image" data-image-dimensions="200x100">
                        </div>
                        <div class="kg-cta-content-inner">
                            <div class="kg-cta-text">This CTA should only be visible to free members</div>
                            <a href="https://example.com/signup" class="kg-cta-button">Sign Up Free</a>
                        </div>
                    </div>
                </div>
                <!--kg-gated-block:end-->
                <p>Some content after the CTA</p>
            `;

            // This simulates what the HTML-to-Lexical converter would produce
            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    text: 'Some content before the CTA'
                                }
                            ]
                        },
                        {
                            type: 'call-to-action',
                            layout: 'minimal',
                            textValue: 'This CTA should only be visible to free members',
                            showButton: true,
                            buttonText: 'Sign Up Free',
                            buttonUrl: 'https://example.com/signup',
                            backgroundColor: 'white',
                            imageUrl: 'https://example.com/image.jpg',
                            imageWidth: 200,
                            imageHeight: 100
                        },
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    text: 'Some content after the CTA'
                                }
                            ]
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            };

            // Apply the visibility preservation
            const result = preserveGatedBlockVisibility(htmlWithGatedCTA, lexicalDoc);

            // Verify the CTA card now has the correct visibility settings
            const ctaCard = result.root.children[1];
            assert.equal(ctaCard.type, 'call-to-action');
            
            // This is the key fix - the visibility should be preserved
            assert.deepEqual(ctaCard.visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });

            // Other content should remain unchanged
            assert.equal(result.root.children[0].type, 'paragraph');
            assert.equal(result.root.children[2].type, 'paragraph');
            assert.equal(result.root.children[0].children[0].text, 'Some content before the CTA');
            assert.equal(result.root.children[2].children[0].text, 'Some content after the CTA');
        });

        it('should handle multiple CTAs with different visibility settings', function () {
            const htmlWithMultipleGatedCTAs = `
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:free"-->
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Free members CTA</div>
                        <a href="https://free.example.com" class="kg-cta-button">Free Signup</a>
                    </div>
                </div>
                <!--kg-gated-block:end-->
                
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:-free"-->
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Paid members CTA</div>
                        <a href="https://paid.example.com" class="kg-cta-button">Upgrade Now</a>
                    </div>
                </div>
                <!--kg-gated-block:end-->
            `;

            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'call-to-action',
                            textValue: 'Free members CTA',
                            buttonText: 'Free Signup',
                            buttonUrl: 'https://free.example.com'
                        },
                        {
                            type: 'call-to-action',
                            textValue: 'Paid members CTA',
                            buttonText: 'Upgrade Now',
                            buttonUrl: 'https://paid.example.com'
                        }
                    ],
                    type: 'root'
                }
            };

            const result = preserveGatedBlockVisibility(htmlWithMultipleGatedCTAs, lexicalDoc);

            // First CTA should be for free members
            assert.deepEqual(result.root.children[0].visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });

            // Second CTA should be for paid members
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

        it('should not affect CTAs outside of gated blocks', function () {
            const htmlWithMixedCTAs = `
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Public CTA</div>
                        <a href="https://public.example.com" class="kg-cta-button">Public Button</a>
                    </div>
                </div>
                
                <!--kg-gated-block:begin nonMember:false memberSegment:"status:free"-->
                <div class="kg-card kg-cta-card">
                    <div class="kg-cta-content">
                        <div class="kg-cta-text">Free members CTA</div>
                        <a href="https://free.example.com" class="kg-cta-button">Free Button</a>
                    </div>
                </div>
                <!--kg-gated-block:end-->
            `;

            const lexicalDoc = {
                root: {
                    children: [
                        {
                            type: 'call-to-action',
                            textValue: 'Public CTA',
                            buttonText: 'Public Button',
                            buttonUrl: 'https://public.example.com'
                        },
                        {
                            type: 'call-to-action',
                            textValue: 'Free members CTA',
                            buttonText: 'Free Button',
                            buttonUrl: 'https://free.example.com'
                        }
                    ],
                    type: 'root'
                }
            };

            const result = preserveGatedBlockVisibility(htmlWithMixedCTAs, lexicalDoc);

            // First CTA (public) should not have visibility restrictions
            assert.equal(result.root.children[0].visibility, undefined);

            // Second CTA (gated) should have visibility restrictions
            assert.deepEqual(result.root.children[1].visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });
        });
    });
});