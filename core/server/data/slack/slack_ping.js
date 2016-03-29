var https           = require('https'),
    errors          = require('../../errors'),
    url             = require('url'),
    options,
    req,
    slackData = {};

slackData = {
    channel: 'test-slack_',
    username: 'webhookbot',
    icon_emoji: ':ghost:',
    text: 'https://dev.ghost.org/migrating-to-digitalocean/',
    unfurl_links: true
};

// fill the options for https request
options = url.parse('https://hooks.slack.com/services/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');
options.method = 'POST';
options.headers = {'Content-type': 'application/json'};

req = https.request(options);

slackData = JSON.stringify(slackData);

req.write(slackData);
req.on('error', function (error) {
    errors.logError(
        error
    );
});
req.end();
