// Load New Relic
if (process.env.PRO_ENV) {
    require('newrelic');
}

require('./ghost');
