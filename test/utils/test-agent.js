const supertest = require('supertest');
const errors = require('@tryghost/errors');

class TestAgent {
    /**
     * @constructor
     * @param {Object} options
     * @param {String} options.apiURL
     * @param {String} options.originURL
     * @param {Object} options.app  Ghost express app instance
     * @param {Object} options.ownerUser owner used for login
     * @param {String} options.ownerUser.email
     * @param {String} options.ownerUser.password
     */
    constructor({apiURL, app, originURL, ownerUser}) {
        this.API_URL = apiURL;
        this.app = app;
        this.originURL = originURL;
        this.ownerUser = ownerUser;
        this.request = supertest.agent(app);
    }

    /**
     * Helper method to concatenate urls
     * @NOTE: this is essentially a duplicate of our internal urljoin tool that is stuck in the too-big url-utils package atm
     * @param {string} url
     * @returns
     */
    makeUrl(url) {
        // Join the base URL and the main url and remove any duplicate slashes
        return `${this.API_URL}/${url}`.replace(/(^|[^:])\/\/+/g, '$1/');
    }

    // Forward get(), post(), put(), and delete() straight to the request agent & handle the URL
    get(url) {
        return this.request.get(this.makeUrl(url))
            .set('Origin', this.originURL);
    }

    post(url) {
        return this.request.post(this.makeUrl(url))
            .set('Origin', this.originURL);
    }

    put(url) {
        return this.request.put(this.makeUrl(url))
            .set('Origin', this.originURL);
    }

    delete(url) {
        return this.request.delete(this.makeUrl(url))
            .set('Origin', this.originURL);
    }

    async loginAs(email, password) {
        await this.post('/session/')
            .send({
                grant_type: 'password',
                username: email,
                password: password
            })
            .then(function then(res) {
                if (res.statusCode === 302) {
                    // This can happen if you already have an instance running e.g. if you've been using Ghost CLI recently
                    throw new errors.IncorrectUsageError({
                        message: 'Ghost is redirecting, do you have an instance already running on port 2369?'
                    });
                } else if (res.statusCode !== 200 && res.statusCode !== 201) {
                    throw new errors.IncorrectUsageError({
                        message: res.body.errors[0].message
                    });
                }

                return res.headers['set-cookie'];
            });
    }

    async loginAsOwner() {
        await this.loginAs(this.ownerUser.email, this.ownerUser.password);
    }
}

module.exports = TestAgent;
