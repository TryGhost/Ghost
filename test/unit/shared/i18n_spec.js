const should = require('should');
const sinon = require('sinon');

const I18n = require('../../../core/shared/i18n').I18n;

describe('I18n Class Behaviour', function () {
    it('defaults to en', function () {
        const i18n = new I18n();
        i18n.locale().should.eql('en');
    });

    describe('dot notation (default behaviour)', function () {
        const fakeStrings = {
            test: {string: {path: 'I am correct'}}
        };
        let i18n;

        beforeEach(function initBasicI18n() {
            i18n = new I18n();
            sinon.stub(i18n, '_loadStrings').returns(fakeStrings);
            i18n.init();
        });

        it('correctly loads strings', function () {
            i18n._strings.should.eql(fakeStrings);
        });

        it('correctly uses dot notation', function () {
            i18n.t('test.string.path').should.eql('I am correct');
        });

        it('uses fallback correctly', function () {
            i18n.t('unknown.string').should.eql('An error occurred');
        });

        it('errors for invalid strings', function () {
            should(function () {
                i18n.t('unknown string');
            }).throw('i18n.t() called with an invalid path: unknown string');
        });
    });

    describe('fulltext notation (theme behaviour)', function () {
        const fakeStrings = {'Full text': 'I am correct'};
        let i18n;

        beforeEach(function initFulltextI18n() {
            i18n = new I18n({stringMode: 'fulltext'});
            sinon.stub(i18n, '_loadStrings').returns(fakeStrings);
            i18n.init();
        });

        it('correctly loads strings', function () {
            i18n._strings.should.eql(fakeStrings);
        });

        it('correctly uses fulltext with bracket notation', function () {
            i18n.t('Full text').should.eql('I am correct');
        });

        it('uses fallback correctly', function () {
            i18n.t('unknown string').should.eql('unknown string');
        });
    });
});
