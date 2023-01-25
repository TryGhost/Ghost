const MentionNotifications = require('../lib/MentionNotifications');
const sinon = require('sinon');
const {expect} = require('chai');

describe('MentionNotifications', function () {
    let notification;
    let mockMention;
    let mockUsers;
    let mockMailer;
    let mockSettingsCache;
    let mockUrlUtils;

    beforeEach(function () {
        mockMention = {
            id: '1',
            source: 'https://source.com',
            target: 'https://target.com'
        };

        mockUsers = [{email: 'user1@example.com', toJSON: sinon.stub().returns({email: 'user1@example.com', slug: 'user1'})}, {email: 'user2@example.com', toJSON: sinon.stub().returns({email: 'user2@example.com', slug: 'user2'})}];

        mockMailer = {
            send: sinon.stub()
        };

        mockSettingsCache = {
            get: sinon.stub()
        };

        mockUrlUtils = {
            getSiteUrl: sinon.stub(),
            urlFor: sinon.stub(),
            urlJoin: sinon.stub()
        };

        notification = new MentionNotifications({
            logging: {warn: sinon.stub()},
            models: {User: {findAll: sinon.stub().resolves(mockUsers)}},
            settingsCache: mockSettingsCache,
            urlUtils: mockUrlUtils,
            siteDomain: 'example.com',
            settingsHelpers: {
                getDefaultEmailDomain: sinon.stub().returns('example.com'),
                getMembersSupportAddress: sinon.stub().returns('no-reply@example.com')
            },
            mailer: mockMailer
        });
    });

    it('Can render notification emails', async function () {
        await notification.notifyMentionReceived(mockMention);
        expect(mockMailer.send.callCount).to.equal(2);
        expect(mockMailer.send.args[0][0].from).to.equal('no-reply@example.com');
        // just testing for a substring now till we have the full email template and copy finalised.
        expect(mockMailer.send.args[0][0].text).to.contain(`You have been mentioned by ${mockMention.source}.`);
        expect(mockMailer.send.args[0][0].subject).to.equal('You\'ve been mentioned!');
    });
});