// Set of common function that should be main building blocks for e2e tests.
// The e2e tests usually consist of following building blocks:
// - request agent
// - state builder
// - output state checker
//
// The request agetnt is responsible for making HTTP-like requests to an application (express app in case of Ghost).
// Note there's no actual need to make an HTTP request to an actual server, bypassing HTTP and hooking into the application
// directly is enough and reduces dependence on blocking a port (allows to run tests in parallel).
//
// The state builder is responsible for building the state of the application. Usually it's done by using pre-defined fixtures.
// Can include building a DB state, file system state (themes, config files), building configuration state (config files) etc.
//
// The output state checker is responsible for checking the response from the app after performing a request.

const supertest = require('supertest');

const boot = require('../../core/boot');

const startGhost = () => {
    const defaults = {
        backend: true,
        frontend: false,
        server: false
    };

    return boot(defaults);
};

const getAgent = async () => {
    const app = await startGhost();

    return supertest.agent(app);
};

module.exports.getAgent = getAgent;
