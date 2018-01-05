import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-navitem-url-input', function () {
    setupComponentTest('gh-navitem-url-input', {
        unit: true
    });

    it('identifies a URL as the base URL', function () {
        let component = this.subject({
            url: '',
            baseUrl: 'http://example.com/'
        });

        this.render();

        run(function () {
            component.set('value', 'http://example.com/');
        });

        expect(component.get('isBaseUrl')).to.be.ok;

        run(function () {
            component.set('value', 'http://example.com/go/');
        });

        expect(component.get('isBaseUrl')).to.not.be.ok;
    });
});
