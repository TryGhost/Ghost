module.exports = {
    EmailDeliveredEvent: require('./lib/events/EmailDeliveredEvent'),
    EmailOpenedEvent: require('./lib/events/EmailOpenedEvent'),
    EmailBouncedEvent: require('./lib/events/EmailBouncedEvent'),
    EmailTemporaryBouncedEvent: require('./lib/events/EmailTemporaryBouncedEvent'),
    EmailUnsubscribedEvent: require('./lib/events/EmailUnsubscribedEvent'),
    SpamComplaintEvent: require('./lib/events/SpamComplaintEvent'),

    EmailService: require('./lib/EmailService'),
    EmailController: require('./lib/EmailController'),
    EmailRenderer: require('./lib/EmailRenderer'),
    EmailSegmenter: require('./lib/EmailSegmenter'),
    SendingService: require('./lib/SendingService'),
    BatchSendingService: require('./lib/BatchSendingService'),
    EmailEventProcessor: require('./lib/EmailEventProcessor'),
    EmailEventStorage: require('./lib/EmailEventStorage'),
    MailgunEmailProvider: require('./lib/MailgunEmailProvider')
};
