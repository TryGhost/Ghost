const {validate} = require('../../../../../lib/zod/validate');
const {DisableCommentingInput} = require('./schemas/member-commenting');

module.exports = {
    disable: validate(DisableCommentingInput)
};
