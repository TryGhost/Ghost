/* jshint expr:true */
import Ember from 'ember';
import {expect} from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

const {run} = Ember;

describeComponent(
    'gh-navitem-url-input',
    'Unit: Component: gh-navitem-url-input',
    {
        unit: true
    },
    function () {
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
    }
);
