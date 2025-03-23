const clean = require('../utils/clean');

module.exports = (model, frame) => {
    const attrs = model.toJSON(frame.options);
    clean.action(attrs);
    return attrs;
};
