var mobileQuery = matchMedia('(max-width: 900px)'),

    responsiveAction = function responsiveAction(event, mediaCondition, cb) {
        if (!window.matchMedia(mediaCondition).matches) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        cb();
    };

export { mobileQuery, responsiveAction };
export default {
    mobileQuery: mobileQuery,
    responsiveAction: responsiveAction
};
