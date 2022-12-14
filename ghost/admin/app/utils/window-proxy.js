export default {
    changeLocation(url) {
        window.location = url;
    },

    replaceLocation(url) {
        window.location.replace(url);
    },

    replaceState(params, title, url) {
        window.history.replaceState(params, title, url);
    }
};
