import NavigationItem from 'ghost-admin/models/navigation-item';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: navigation-settings', function () {
    setupTest();

    it('deserializes navigation json', function () {
        let transform = this.owner.lookup('transform:navigation-settings');
        let serialized = '[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]';
        let result = transform.deserialize(serialized);

        expect(result.length).to.equal(2);
        expect(result[0]).to.be.instanceof(NavigationItem);
        expect(result[0].get('label')).to.equal('One');
        expect(result[0].get('url')).to.equal('/one');
        expect(result[1]).to.be.instanceof(NavigationItem);
        expect(result[1].get('label')).to.equal('Two');
        expect(result[1].get('url')).to.equal('/two');
    });

    it('serializes array of NavigationItems', function () {
        let transform = this.owner.lookup('transform:navigation-settings');
        let deserialized = emberA([
            NavigationItem.create({label: 'One', url: '/one'}),
            NavigationItem.create({label: 'Two', url: '/two'})
        ]);
        let result = transform.serialize(deserialized);

        expect(result).to.equal('[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]');
    });
});
