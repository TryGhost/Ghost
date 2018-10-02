module.exports = {
    get getSession() {
        return require('./middleware').getSession;
    },
    get cookieCsrfProtection() {
        return require('./middleware').cookieCsrfProtection;
    },
    get safeGetSession() {
        return require('./middleware').safeGetSession;
    },
    get createSession() {
        return require('./middleware').createSession;
    },
    get destroySession() {
        return require('./middleware').destroySession;
    },
    get getUser() {
        return require('./middleware').getUser;
    },
    get ensureUser() {
        return require('./middleware').ensureUser;
    }
};
