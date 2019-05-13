import SlackIntegration from 'ghost-admin/models/slack-integration';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Transform: slack-settings', function () {
    setupTest();

    it('deserializes settings json', function () {
        let transform = this.owner.lookup('transform:slack-settings');
        let serialized = '[{"url":"http://myblog.com/blogpost1","username":"SlackBot"}]';
        let result = transform.deserialize(serialized);

        expect(result.length).to.equal(1);
        expect(result[0]).to.be.instanceof(SlackIntegration);
        expect(result[0].get('url')).to.equal('http://myblog.com/blogpost1');
        expect(result[0].get('username')).to.equal('SlackBot');
    });

    it('deserializes empty array', function () {
        let transform = this.owner.lookup('transform:slack-settings');
        let serialized = '[]';
        let result = transform.deserialize(serialized);

        expect(result.length).to.equal(1);
        expect(result[0]).to.be.instanceof(SlackIntegration);
        expect(result[0].get('url')).to.equal('');
        expect(result[0].get('username')).to.equal('');
    });

    it('serializes array of Slack settings', function () {
        let transform = this.owner.lookup('transform:slack-settings');
        let deserialized = emberA([
            SlackIntegration.create({url: 'http://myblog.com/blogpost1', username: 'SlackBot'})
        ]);
        let result = transform.serialize(deserialized);

        expect(result).to.equal('[{"url":"http://myblog.com/blogpost1","username":"SlackBot"}]');
    });

    it('serializes empty SlackIntegration objects', function () {
        let transform = this.owner.lookup('transform:slack-settings');
        let deserialized = emberA([
            SlackIntegration.create({url: ''})
        ]);
        let result = transform.serialize(deserialized);

        expect(result).to.equal('[]');
    });
});
