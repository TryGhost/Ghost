import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getPublicPreviewWarning} from 'ghost-admin/utils/public-preview-warning';

function paragraph(text = '', type = 'extended-text') {
    return {
        children: text ? [{text, type}] : [],
        type: 'paragraph'
    };
}

function lexicalWithPublicPreview({
    before = [paragraph('Public preview content')],
    after = [paragraph('Full post content')]
} = {}) {
    return JSON.stringify({
        root: {
            children: [
                ...before,
                {type: 'paywall'},
                ...after
            ],
            type: 'root'
        }
    });
}

describe('Unit: Util: public-preview-warning', function () {
    it('returns no warning without a valid public preview', function () {
        expect(getPublicPreviewWarning({
            lexical: null,
            visibility: 'paid'
        })).to.be.null;

        expect(getPublicPreviewWarning({
            lexical: '{not-valid-json',
            visibility: 'paid'
        })).to.be.null;

        expect(getPublicPreviewWarning({
            lexical: JSON.stringify({root: {children: [paragraph('Post content')]}}),
            visibility: 'paid'
        })).to.be.null;
    });

    it('warns for public access before checking surrounding content', function () {
        expect(getPublicPreviewWarning({
            lexical: lexicalWithPublicPreview({before: [], after: []}),
            visibility: 'public'
        })).to.equal('public-access');
    });

    it('warns when there is no meaningful content above the public preview', function () {
        expect(getPublicPreviewWarning({
            lexical: lexicalWithPublicPreview({
                before: [
                    paragraph(),
                    paragraph('   '),
                    {type: 'linebreak'}
                ]
            }),
            visibility: 'paid'
        })).to.equal('no-content-before');
    });

    it('warns when there is no meaningful content below the public preview', function () {
        expect(getPublicPreviewWarning({
            lexical: lexicalWithPublicPreview({
                after: [
                    paragraph(),
                    paragraph('\n\t', 'text'),
                    {type: 'linebreak'}
                ]
            }),
            visibility: 'members'
        })).to.equal('no-content-after');
    });

    it('prioritizes missing content above when both sides are empty', function () {
        expect(getPublicPreviewWarning({
            lexical: lexicalWithPublicPreview({before: [], after: []}),
            visibility: 'paid'
        })).to.equal('no-content-before');
    });

    it('counts visible non-text cards as content', function () {
        expect(getPublicPreviewWarning({
            lexical: lexicalWithPublicPreview({
                before: [{src: 'https://example.com/image.jpg', type: 'image'}],
                after: [{url: 'https://example.com/video', type: 'embed'}]
            }),
            visibility: 'paid'
        })).to.be.null;
    });

    it('uses unsaved lexical scratch state when available', function () {
        expect(getPublicPreviewWarning({
            lexical: lexicalWithPublicPreview(),
            lexicalScratch: lexicalWithPublicPreview({before: []}),
            visibility: 'paid'
        })).to.equal('no-content-before');
    });
});
