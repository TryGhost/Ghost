export default {
    changeLocation(url) {
        window.location = url;
    },

    replaceLocation(url) {
        window.location.replace(url);
    },

    replaceHash(route) {
        window.location.replace(`#${route}`);
    },

    replaceState(params, title, url) {
        window.history.replaceState(params, title, url);
    },

    reload() {
        window.location.reload();
    }
};
