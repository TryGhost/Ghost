module.exports = {
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
