/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import Ember from 'ember';
import SlackIntegration from 'ghost/models/slack-integration';

const emberA = Ember.A;

describeModule(
    'transform:slack-settings',
    'Unit: Transform: slack-settings',
    {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    },
    function() {
        it('deserializes settings json', function () {
            let transform = this.subject();
            let serialized = '[{"url":"http://myblog.com/blogpost1","channel":"#general","username":"ghost_bot","icon_emoji":":ghost:","isActive":"true"}]';
            let result = transform.deserialize(serialized);

            expect(result.length).to.equal(1);
            expect(result[0]).to.be.instanceof(SlackIntegration);
            expect(result[0].get('url')).to.equal('http://myblog.com/blogpost1');
            expect(result[0].get('channel')).to.equal('#general');
            expect(result[0].get('username')).to.equal('ghost_bot');
            expect(result[0].get('icon')).to.equal(':ghost:');
            expect(result[0].get('isActive')).to.equal('true');
        });

        it('serializes array of Slack settings', function () {
            let transform = this.subject();
            let deserialized = emberA([
                SlackIntegration.create({url: 'http://myblog.com/blogpost1', channel: '#general', username: 'ghost_bot', 'icon': ':ghost:', isActive: 'true'})
            ]);
            let result = transform.serialize(deserialized);

            expect(result).to.equal('[{"url":"http://myblog.com/blogpost1","channel":"#general","username":"ghost_bot","icon_emoji":":ghost:","isActive":"true"}]');
        });
    }
);
