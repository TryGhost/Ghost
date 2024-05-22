const should = require('should');
const sinon = require('sinon');

const {registerHelper, shouldCompileToExpected} = require('./utils/handlebars');

describe('Search helper', function () {
    before(function () {
        registerHelper('search');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('{{search}}', function () {
        it('outputs the exact svg string for the search icon', function () {
            const templateString = '{{search}}';
            const expected = '<button class="gh-search-icon" aria-label="search" data-ghost-search style="display: inline-flex; justify-content: center; align-items: center; width: 32px; height: 32px; padding: 0; border: 0; color: inherit; background-color: transparent; cursor: pointer; outline: none;"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M14.949 14.949a1 1 0 0 1 1.414 0l6.344 6.344a1 1 0 0 1-1.414 1.414l-6.344-6.344a1 1 0 0 1 0-1.414Z" fill="currentColor"/><path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-9 7a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z" fill="currentColor"/></svg></button>';

            shouldCompileToExpected(templateString, {}, expected);
        });
    });
});
