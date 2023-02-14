const assert = require('assert');
const sinon = require('sinon');
const {SlackNotifications} = require('../index');

describe('SlackNotifications', function () {
    let eventStub;
    let registeredEvents = {};
    let slackNotifications;
    let listenerStub;

    beforeEach(function () {
        eventStub = {
            events: [],
            on: function (event, listener) {
                registeredEvents[event] = listener;
            },
            emit: function (event, data) {
                if (registeredEvents[event]) {
                    registeredEvents[event].call(this, data);
                }
            }
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can add custom event types and listens to them', function () {
        const eventData = {message: 'test'};

        slackNotifications = new SlackNotifications({
            events: eventStub,
            slackOptions: {},
            url: 'https://test.com'
        });

        listenerStub = sinon.stub(slackNotifications, 'listener').returns(slackNotifications.send(eventData));

        slackNotifications.listen();

        slackNotifications.addEventTypes(['post.published']);

        eventStub.emit('post.published', eventData);
        eventStub.emit('slack.test', eventData);
        eventStub.emit('not.listening.to', eventData);

        assert(listenerStub.calledTwice);
    });
});
