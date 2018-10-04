module.exports = {
    all(apiConfig, frame) {
        if (frame.options.filter) {
            if (frame.options.filter.match(/page:\w+\+?/)) {
                frame.options.filter = frame.options.filter.replace(/page:\w+\+?/, '');
            }

            if (frame.options.filter) {
                frame.options.filter = frame.options.filter + '+page:true';
            } else {
                frame.options.filter = 'page:true';
            }
        } else {
            frame.options.filter = 'page:true';
        }
    }
};
