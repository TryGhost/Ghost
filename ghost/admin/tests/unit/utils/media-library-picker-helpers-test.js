import {cardKindFor, getMediaInput} from 'ghost-admin/utils/media-library-picker-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';

// Build a file input, optionally nested inside the post editor wrapper so
// `closest('.gh-koenig-editor')` matches it.
function fileInput({accept, name, inEditor = false} = {}) {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) {
        input.setAttribute('accept', accept);
    }
    if (name) {
        input.setAttribute('name', name);
    }
    if (inEditor) {
        const editor = document.createElement('div');
        editor.className = 'gh-koenig-editor';
        editor.appendChild(input);
    }
    return input;
}

describe('Unit: Util: media-library-picker-helpers', function () {
    describe('getMediaInput (decides whether to open the picker)', function () {
        it('matches any file input inside the editor (cards + feature image)', function () {
            // The editor's media cards and the feature image all live inside
            // .gh-koenig-editor; every kind is intercepted regardless of accept.
            expect(getMediaInput(fileInput({accept: 'image/*', inEditor: true}))).to.be.ok;
            expect(getMediaInput(fileInput({accept: 'video/mp4', inEditor: true}))).to.be.ok;
            expect(getMediaInput(fileInput({accept: 'audio/*', inEditor: true}))).to.be.ok;
            // The any-file card has no media accept but is still in the editor.
            expect(getMediaInput(fileInput({name: 'file-input', inEditor: true}))).to.be.ok;
        });

        it('ignores image file inputs outside the editor (tags, settings, etc.)', function () {
            // These uploaders also accept images, but they are not part of the
            // post content we inventory, and reusing there would re-upload, so
            // they keep their native dialog.
            expect(getMediaInput(fileInput({accept: 'image/*'}))).to.be.null;
            expect(getMediaInput(fileInput({accept: 'image/png', name: 'image-input'}))).to.be.null;
        });

        it('ignores non-media file inputs even inside the editor wrapper region', function () {
            // A theme zip / CSV import would never appear inside the editor, but
            // guard the type check regardless.
            expect(getMediaInput(fileInput({accept: '.zip'}))).to.be.null;
            expect(getMediaInput(fileInput())).to.be.null;
        });

        it('ignores targets that are not file inputs', function () {
            const text = document.createElement('input');
            text.type = 'text';
            text.setAttribute('accept', 'image/*');
            expect(getMediaInput(text)).to.be.null;
            expect(getMediaInput(document.createElement('div'))).to.be.null;
            expect(getMediaInput(null)).to.be.null;
        });
    });

    describe('cardKindFor (the type the picker locks/labels to)', function () {
        it('maps the accept type to the card kind', function () {
            expect(cardKindFor(fileInput({accept: 'image/*'}))).to.equal('image');
            expect(cardKindFor(fileInput({accept: 'video/mp4'}))).to.equal('video');
            expect(cardKindFor(fileInput({accept: 'audio/*'}))).to.equal('audio');
        });

        it('falls back to file for the any-file card', function () {
            expect(cardKindFor(fileInput({name: 'file-input'}))).to.equal('file');
            expect(cardKindFor(fileInput())).to.equal('file');
        });
    });
});
