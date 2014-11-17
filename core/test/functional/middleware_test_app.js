var express = require('express'),
    ghostMiddleware = require('../../../as-middleware'),

    ghostConfig = require('../../../config.example.js')[process.env.NODE_ENV],
    host = ghostConfig.server.host,
    port = ghostConfig.server.port,

    app, ghost;

// information Ghost should get from Express once it is mounted
delete ghostConfig.server;
delete ghostConfig.url;
ghost = ghostMiddleware(ghostConfig);

app = express();
app.use('/', ghost);   // mount at root so paths in tests work for middleware and non-middleware

ghost.ghostPromise.then(function () {
    app.listen(port, host);
    console.log('Middleware test harness listening on ' + host + ':' + port);
});
