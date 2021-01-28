const MaintenanceApp = require('@tryghost/maintenance');
const express = require('../../../shared/express');

module.exports = new MaintenanceApp({
    express
}).app;
