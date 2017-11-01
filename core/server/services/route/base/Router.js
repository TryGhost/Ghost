'use strict';

var expressRouter = require('express').Router;

class Router {
    constructor() {
        this.router = expressRouter({mergeParams: true});
    }
}

module.exports = Router;
