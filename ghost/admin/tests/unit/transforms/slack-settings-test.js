/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import {A as emberA} from 'ember-array/utils';
import SlackIntegration from 'ghost-admin/models/slack-integration';

describeModule(
    'transform:slack-settings',
    'Unit: Transform: slack-settings',
    {},
    function() {
        it('deserializes settings json', function () {
            let transform = this.subject();
            let serialized = '[{"url":"http://myblog.com/blogpost1"}]';
            let result = transform.deserialize(serialized);

            expect(result.length).to.equal(1);
            expect(result[0]).to.be.instanceof(SlackIntegration);
            expect(result[0].get('url')).to.equal('http://myblog.com/blogpost1');
        });

        it('serializes array of Slack settings', function () {
            let transform = this.subject();
            let deserialized = emberA([
                SlackIntegration.create({url: 'http://myblog.com/blogpost1'})
            ]);
            let result = transform.serialize(deserialized);

            expect(result).to.equal('[{"url":"http://myblog.com/blogpost1"}]');
        });
    }
);
