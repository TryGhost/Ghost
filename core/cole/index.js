var express = require('express'),
  coleRoutes;

coleRoutes = function coleRoutes(middleware) {
  var router = express.Router();

  router.get(/^\/(ht|hometeaching)\/$/, function(req, res) {
    res.send('Welcome to hometeaching!!');
  });

};

module.exports = coleRoutes;
