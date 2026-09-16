import {canCopyGiftLink} from 'ghost-admin/utils/gift-link';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit | Utility | gift-link', function () {
    const admin = {isAdmin: true, isEitherEditor: false, isAuthor: false};
    const editor = {isAdmin: false, isEitherEditor: true, isAuthor: false};
    const author = {isAdmin: false, isEitherEditor: false, isAuthor: true};
    const contributor = {isAdmin: false, isEitherEditor: false, isAuthor: false};
    const gatedPublished = {isPublished: true, visibility: 'paid'};

    it('allows a managing user on a published, gated post', function () {
        expect(canCopyGiftLink({user: admin, post: gatedPublished})).to.be.true;
        expect(canCopyGiftLink({user: editor, post: gatedPublished})).to.be.true;
        expect(canCopyGiftLink({user: admin, post: {isPublished: true, visibility: 'members'}})).to.be.true;
    });

    it('is false for users who cannot manage links', function () {
        expect(canCopyGiftLink({user: contributor, post: gatedPublished})).to.be.false;
        expect(canCopyGiftLink({user: author, post: gatedPublished})).to.be.false;
    });

    it('is false for public, draft, or non-gated posts', function () {
        expect(canCopyGiftLink({user: admin, post: {isPublished: true, visibility: 'public'}})).to.be.false;
        expect(canCopyGiftLink({user: admin, post: {isPublished: false, visibility: 'paid'}})).to.be.false;
        expect(canCopyGiftLink({user: admin, post: {isPublished: true, visibility: null}})).to.be.false;
    });

    it('is false when user or post is missing', function () {
        expect(canCopyGiftLink({post: gatedPublished})).to.be.false;
        expect(canCopyGiftLink({user: admin})).to.be.false;
        expect(canCopyGiftLink()).to.be.false;
    });
});
