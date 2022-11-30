module.exports = {
    EmailService: require('./lib/email-service'),
    EmailController: require('./lib/email-controller'),
    EmailRenderer: require('./lib/email-renderer'),
    EmailSegmenter: require('./lib/email-segmenter'),
    SendingService: require('./lib/sending-service'),
    BatchSendingService: require('./lib/batch-sending-service'),
    EmailEventProcessor: require('./lib/email-event-processor'),
    EmailEventStorage: require('./lib/email-event-storage'),
    MailgunEmailProvider: require('./lib/mailgun-email-provider')
};
