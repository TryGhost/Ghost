import NavigationItem from 'ghost-admin/models/navigation-item';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: navigation-settings', function () {
    setupTest();

    it('deserializes navigation json', function () {
        let transform = this.owner.lookup('transform:navigation-settings');
        let serialized = '[{"label":"One","url":"/one","icon":"https://example.com/one.svg","visibility":"members"},{"label":"Two","url":"/two"},{"label":"Three","url":"/three","visibility":"public_free"},{"label":"Four","url":"/four","visibility":"none"}]';
        let result = transform.deserialize(serialized);

        expect(result.length).to.equal(4);
        expect(result[0]).to.be.instanceof(NavigationItem);
        expect(result[0].get('label')).to.equal('One');
        expect(result[0].get('url')).to.equal('/one');
        expect(result[0].get('icon')).to.equal('https://example.com/one.svg');
        expect(result[0].get('visibility')).to.equal('members');
        expect(result[1]).to.be.instanceof(NavigationItem);
        expect(result[1].get('label')).to.equal('Two');
        expect(result[1].get('url')).to.equal('/two');
        expect(result[1].get('visibility')).to.equal('public');
        expect(result[2]).to.be.instanceof(NavigationItem);
        expect(result[2].get('label')).to.equal('Three');
        expect(result[2].get('url')).to.equal('/three');
        expect(result[2].get('visibility')).to.equal('public_free');
        expect(result[3]).to.be.instanceof(NavigationItem);
        expect(result[3].get('label')).to.equal('Four');
        expect(result[3].get('url')).to.equal('/four');
        expect(result[3].get('visibility')).to.equal('none');
    });

    it('serializes array of NavigationItems', function () {
        let transform = this.owner.lookup('transform:navigation-settings');
        let deserialized = emberA([
            NavigationItem.create({label: 'One', url: '/one', icon: 'https://example.com/one.svg', visibility: 'members'}),
            NavigationItem.create({label: 'Two', url: '/two', visibility: 'public'}),
            NavigationItem.create({label: 'Three', url: '/three', visibility: 'public_free'}),
            NavigationItem.create({label: 'Four', url: '/four', visibility: 'none'})
        ]);
        let result = transform.serialize(deserialized);

        expect(result).to.equal('[{"label":"One","url":"/one","icon":"https://example.com/one.svg","visibility":"members"},{"label":"Two","url":"/two"},{"label":"Three","url":"/three","visibility":"public_free"},{"label":"Four","url":"/four","visibility":"none"}]');
    });
});
