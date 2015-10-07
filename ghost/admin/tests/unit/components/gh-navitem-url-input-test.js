/* jshint expr:true */
import Ember from 'ember';
import {expect} from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-navitem-url-input',
    'Unit: Component: gh-navitem-url-input',
    {
        unit: true
    },
    function () {
        it('identifies a URL as the base URL', function () {
            var component = this.subject({
                url: '',
                baseUrl: 'http://example.com/'
            });

            this.render();

            Ember.run(function () {
                component.set('value', 'http://example.com/');
            });

            expect(component.get('isBaseUrl')).to.be.ok;

            Ember.run(function () {
                component.set('value', 'http://example.com/go/');
            });

            expect(component.get('isBaseUrl')).to.not.be.ok;
        });
    }
);
