/* jshint expr:true */
import Ember from 'ember';
import {expect} from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-navitem-url-input',
    'GhNavitemUrlInputComponent',
    {},
    function () {
        it('renders', function () {
            var component = this.subject();

            expect(component._state).to.equal('preRender');

            this.render();

            expect(component._state).to.equal('inDOM');
        });

        it('renders correctly with a URL that matches the base URL', function () {
            var component = this.subject({
                baseUrl: 'http://example.com/'
            });

            Ember.run(function () {
                component.set('value', 'http://example.com/');
            });

            this.render();

            expect(this.$().val()).to.equal('http://example.com/');
        });

        it('renders correctly with a relative URL', function () {
            var component = this.subject({
                baseUrl: 'http://example.com/'
            });

            Ember.run(function () {
                component.set('value', '/go/docs');
            });

            this.render();

            expect(this.$().val()).to.equal('/go/docs');
        });

        it('renders correctly with a mailto URL', function () {
            var component = this.subject({
                baseUrl: 'http://example.com/'
            });

            Ember.run(function () {
                component.set('value', 'mailto:someone@example.com');
            });

            this.render();

            expect(this.$().val()).to.equal('mailto:someone@example.com');
        });

        it('identifies a URL as relative', function () {
            var component = this.subject({
                baseUrl: 'http://example.com/',
                url: '/go/docs'
            });

            this.render();

            expect(component.get('isRelative')).to.be.ok;

            Ember.run(function () {
                component.set('value', 'http://example.com/go/docs');
            });

            expect(component.get('isRelative')).to.not.be.ok;
        });

        it('identifies a URL as the base URL', function () {
            var component = this.subject({
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
