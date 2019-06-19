module.exports = function registerHelpers(ghost) {
    ghost.helpers.register('input_password', require('./input_password'));
};
