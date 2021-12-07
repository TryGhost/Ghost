const supertest = require('supertest');
const errors = require('@tryghost/errors');

class TestAgent {
    /**
     * @constructor
     * @param {String} API_URL
     * @param {Object} app  Ghost express app instance
     */
    constructor(API_URL, app) {
        this.API_URL = API_URL;
        this.app = app;
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
        return this.request.get(this.makeUrl(url));
    }

    post(url) {
        return this.request.post(this.makeUrl(url));
    }

    put(url) {
        return this.request.put(this.makeUrl(url));
    }

    delete(url) {
        return this.request.delete(this.makeUrl(url));
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
        // temporary copy-pasta
        let user = {
            // owner (owner is still id 1 because of permissions)
            id: '1',
            name: 'Joe Bloggs',
            slug: 'joe-bloggs',
            email: 'jbloggs@example.com',
            password: 'Sl1m3rson99',
            profile_image: 'https://example.com/super_photo.jpg'
        };

        await this.loginAs(user.email, user.password);
    }
}

module.exports = TestAgent;
