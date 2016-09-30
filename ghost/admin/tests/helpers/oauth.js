import {faker} from 'ember-cli-mirage';
import RSVP from 'rsvp';

let generateCode = function generateCode() {
    return faker.internet.password(32, false, /[a-zA-Z0-9]/);
};

let generateSecret = function generateSecret() {
    return faker.internet.password(12, false, /[a-f0-9]/);
};

const stubSuccessfulOAuthConnect = function stubSuccessfulOAuthConnect(application) {
    let provider = application.__container__.lookup('torii-provider:ghost-oauth2');

    provider.open = function () {
        return RSVP.Promise.resolve({
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            authorizationCode: generateCode(),
            client_id: 'ghost-admin',
            client_secret: generateSecret(),
            provider: 'ghost-oauth2',
            redirectUrl: 'http://localhost:2368/ghost/'
            /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        });
    };
};

const stubFailedOAuthConnect = function stubFailedOAuthConnect(application) {
    let provider = application.__container__.lookup('torii-provider:ghost-oauth2');

    provider.open = function () {
        return RSVP.Promise.reject();
    };
};

export {
    stubSuccessfulOAuthConnect,
    stubFailedOAuthConnect
};
