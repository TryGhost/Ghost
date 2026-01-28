const {assert, findSentEmail} = require('../../utils/e2e-framework-mock-manager');

/**
 * Polls the mocked email outbox until a matcher returns a value or times out
 * @param {() => any|null} tryFn synchronous function that returns a truthy value when found, otherwise null
 * @param {object} options
 * @param {number} [options.initialDelayMs=10]
 * @param {number} [options.maxRetries=5]
 * @returns {Promise<any|null>}
 */
const pollEmail = async (tryFn, {initialDelayMs = 10, maxRetries = 5} = {}) => {
    const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));
    let delay = initialDelayMs;
    let retries = maxRetries;
    while (retries > 0) {
        const value = tryFn();
        if (value) {
            return value;
        }
        await timeout(delay);
        delay *= 2;
        retries -= 1;
    }
    return null;
};

/**
 * Extracts a 6-digit verification/OTC code from an email matching the given subject
 * @param {RegExp|string} subjectMatcher
 * @returns {Promise<string|null>}
 */
const getEmailVerificationCode = async (subjectMatcher) => {
    const tryGet = () => {
        try {
            const email = findSentEmail({subject: subjectMatcher}) || assert.sentEmail({subject: subjectMatcher});
            const match = email.subject && email.subject.match(/[0-9]{6}/);
            return match ? match[0] : null;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            return null;
        }
    };
    return await pollEmail(tryGet);
};

/**
 * Extracts the first URL from the email's html or text body that matches an optional filter
 * @param {Object} opts
 * @param {RegExp|string} [opts.subject]
 * @param {RegExp} [opts.urlPattern] Optional regex to validate/select the link
 * @returns {Promise<string|null>}
 */
const getEmailLink = async ({subject, urlPattern} = {}) => {
    const urlRegex = /https?:\/\/[^\s\">]+/g;
    const tryGet = () => {
        try {
            const matchers = {};
            if (subject) {
                matchers.subject = subject;
            }
            const email = findSentEmail(matchers) || assert.sentEmail(matchers);
            const sources = [email.html, email.text].filter(Boolean);
            for (const source of sources) {
                const urls = String(source).match(urlRegex) || [];
                for (const url of urls) {
                    if (!urlPattern || urlPattern.test(url)) {
                        return url;
                    }
                }
            }
            return null;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            return null;
        }
    };
    return await pollEmail(tryGet);
};

module.exports = {
    pollEmail,
    getEmailVerificationCode,
    getEmailLink
};

