import NavItem from 'ghost-admin/models/navigation-item';
import validator from 'ghost-admin/validators/nav-item';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';

const testInvalidUrl = function (url) {
    let navItem = NavItem.create({url});

    validator.check(navItem, 'url');

    expect(validator.get('passed'), `"${url}" passed`).to.be.false;
    expect(navItem.get('errors').errorsFor('url').toArray()).to.deep.equal([{
        attribute: 'url',
        message: 'You must specify a valid URL or relative path'
    }]);
    expect(navItem.get('hasValidated')).to.include('url');
};

const testValidUrl = function (url) {
    let navItem = NavItem.create({url});

    validator.check(navItem, 'url');

    expect(validator.get('passed'), `"${url}" failed`).to.be.true;
    expect(navItem.get('hasValidated')).to.include('url');
};

describe('Unit: Validator: nav-item', function () {
    it('requires label presence', function () {
        let navItem = NavItem.create();

        validator.check(navItem, 'label');

        expect(validator.get('passed')).to.be.false;
        expect(navItem.get('errors').errorsFor('label').toArray()).to.deep.equal([{
            attribute: 'label',
            message: 'You must specify a label'
        }]);
        expect(navItem.get('hasValidated')).to.include('label');
    });

    it('requires url presence', function () {
        let navItem = NavItem.create();

        validator.check(navItem, 'url');

        expect(validator.get('passed')).to.be.false;
        expect(navItem.get('errors').errorsFor('url').toArray()).to.deep.equal([{
            attribute: 'url',
            message: 'You must specify a URL or relative path'
        }]);
        expect(navItem.get('hasValidated')).to.include('url');
    });

    it('fails on invalid url values', function () {
        let invalidUrls = [
            'test@example.com',
            '/has spaces',
            'no-leading-slash',
            'http://example.com/with spaces'
        ];

        invalidUrls.forEach(function (url) {
            testInvalidUrl(url);
        });
    });

    it('passes on valid url values', function () {
        let validUrls = [
            'http://localhost:2368',
            'http://localhost:2368/some-path',
            'https://localhost:2368/some-path',
            '//localhost:2368/some-path',
            'http://localhost:2368/#test',
            'http://localhost:2368/?query=test&another=example',
            'http://localhost:2368/?query=test&another=example#test',
            'tel:01234-567890',
            'mailto:test@example.com',
            'http://some:user@example.com:1234',
            '/relative/path'
        ];

        validUrls.forEach(function (url) {
            testValidUrl(url);
        });
    });

    it('validates url and label by default', function () {
        let navItem = NavItem.create();

        validator.check(navItem);

        expect(navItem.get('errors').errorsFor('label')).to.not.be.empty;
        expect(navItem.get('errors').errorsFor('url')).to.not.be.empty;
        expect(validator.get('passed')).to.be.false;
    });
});
