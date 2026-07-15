import {describe, it} from 'mocha';
import {expect} from 'chai';
import {lexicalHasPublicPreview} from 'ghost-admin/components/editor/publish-management';

describe('Unit: Component: editor/publish-management', function () {
    describe('lexicalHasPublicPreview()', function () {
        it('finds a public preview nested in Lexical content', function () {
            const lexical = JSON.stringify({
                root: {
                    children: [
                        {children: [], type: 'paragraph'},
                        {type: 'paywall'}
                    ],
                    type: 'root'
                }
            });

            expect(lexicalHasPublicPreview(lexical)).to.be.true;
        });

        it('returns false for content without a public preview', function () {
            const lexical = {
                root: {
                    children: [{children: [], type: 'paragraph'}],
                    type: 'root'
                }
            };

            expect(lexicalHasPublicPreview(lexical)).to.be.false;
        });

        it('returns false for invalid Lexical content', function () {
            expect(lexicalHasPublicPreview('{invalid')).to.be.false;
        });
    });
});
