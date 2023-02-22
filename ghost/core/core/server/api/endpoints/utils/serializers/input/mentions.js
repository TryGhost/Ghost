module.exports = {
    browse(_apiConfig, frame) {
        // Force source:-~^'https://brid.gy/' to be added to the filter
        const filterBridgy = `source:-~^'https://brid.gy/'`;
        if (frame.options.filter) {
            frame.options.filter = `${frame.options.filter}+${filterBridgy}`;
        } else {
            frame.options.filter = filterBridgy;
        }
    }
};
