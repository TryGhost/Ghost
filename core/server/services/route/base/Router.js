var express = require('express');

module.exports = function newRouter() {
    return express.Router({mergeParams: true});
};
