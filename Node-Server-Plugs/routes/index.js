module.exports = function(plugs) {
    var express = require('express');
    var router = express.Router();

  /* GET home page. */
    router.get('/', function (req, res, next) {
        res.render('index', {plugs: plugs.activePlugs});
    });

    return router;
};