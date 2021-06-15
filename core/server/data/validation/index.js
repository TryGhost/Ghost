module.exports = {
    validate: require('./validate'),
    validator: require('./validator'),

    // These two things are dependent on validator, not related
    validatePassword: require('./password')
};
