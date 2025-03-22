const contentGatingService = require('../../../../../../services/content-gating');
const labs = require('../../../../../../../shared/labs');

// @TODO: reconsider the location of this - it's part of members and adds a property to the API
const forPost = (attrs, frame) => {
    const addAccessAttr = !Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'));

    contentGatingService.gatePostAttrs(attrs, frame.original.context.member, {addAccessAttr, labs});

    return attrs;
};

module.exports = {
    forPost
};
