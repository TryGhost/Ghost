const create = (options) => {
    return {
        getToken() {
            return Promise.resolve();
        },

        login() {
            return Promise.resolve();
        },

        logout() {
            return Promise.resolve();
        }
    }
};

module.exports.create = create;
