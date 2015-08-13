var Promise      = require('bluebird'),
    api          = require('./api'),
    CronJob      = require('cron').CronJob,
    moment       = require('moment');

function GhostPublisher() {}

// *This promise should always resolve to avoid halting Ghost::init*.
GhostPublisher.prototype.init = function () {
    // Set a cronjob task which publishes posts (currently with status = "draft")
    // with expired publish datetime.
    // Because publish datetime is usually set per minutes (with seconds being set
    // to "00") we will cover good auto-publish timing by running the task
    // on first second (and not on second ZERO) of every minute.
    var job = new CronJob({
        cronTime: '01 * * * * *',
        onTick: function () {
            // Note context: {intenal: true} there in both `.browse` and `.edit` calls?
            // It's done so that to avoid authorization check
            api.posts.browse({status: 'draft', context: {internal: true}}).then(function (response) {
                response.posts.forEach(function (post) {
                    // Normalize both post publish datetime and current datetime to
                    // Universal Time in Unix Timestamp format so that they could be
                    // numerically compared
                    var publishedTimestamp = moment(post.published_at).utc().format('X'),
                        currentTimestamp = moment().utc().format('X');

                    if (publishedTimestamp < currentTimestamp) {
                        console.log('Publishing post #' + post.id);

                        api.posts.edit({
                            posts: [{status: 'published'}]
                        }, {
                            id: post.id,
                            context: {internal: true}
                        });
                    }
                });
            });
        },
        start: false,
        timeZone: 'GMT'
    });
    job.start();

    return Promise.resolve();
};

module.exports = new GhostPublisher();
