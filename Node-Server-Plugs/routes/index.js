module.exports = function(socket_io_server) {
    var express = require('express');
    var router = express.Router();
    var scanner = require('../scanner');
    var plugs = require('../plugs');
    var firstTime = true;

  /* GET home page. */
    router.get('/', function (req, res, next) {
        if (firstTime) {
            scanner.networkScanner(socket_io_server);
            firstTime = false;
        }
        res.render('index', {plugs: plugs.activePlugs});
    });

    return router;
};