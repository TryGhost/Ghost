// Canned Ghost Admin API response data, ported from apps/admin-x-framework/src/test/responses — see fixtures/index.ts.
// `labs` is not in this map — `configResponse` fills it from the labs defaults so it stays in lockstep with `settingsResponse`.
export const configData = {
    config: {
        version: "6.52.1",
        environment: "development",
        database: "better-sqlite3",
        mail: "SMTP",
        useGravatar: true,
        clientExtensions: {},
        enableDeveloperExperiments: true,
        stripeDirect: false,
        mailgunIsConfigured: false,
        emailAnalytics: true,
        klipy: {
            apiKey: null,
            contentFilter: "off"
        },
        editor: {
            url: "http://editor.test/koenig-lexical.umd.js",
            version: ""
        },
        adminX: {
            url: "http://admin-x.test/admin-x-settings.umd.js",
            version: "0.0"
        },
        signupForm: {
            url: "https://signup-form.test/signup-form.min.js",
            version: "0.2"
        },
        security: {
            staffDeviceVerification: true
        }
    }
};
