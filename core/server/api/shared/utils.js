const _ = require('lodash');

const required = key => ({[key]: {required: true}});
const allowed = (key, values) => ({[key]: {values}});

const wrapValidation = (fn, type) => (...args) => ({[type]: fn(...args)});

const requiredData = wrapValidation(required, 'data');
const requiredOptions = wrapValidation(required, 'options');
const allowedData = wrapValidation(allowed, 'data');
const allowedOptions = wrapValidation(allowed, 'options');

const mergeValidations = _.merge;

module.exports = {
    requiredData,
    requiredOptions,
    allowedData,
    allowedOptions,
    mergeValidations
};
