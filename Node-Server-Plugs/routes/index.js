module.exports = function(socket_io_server) {
    var express = require('express');
    var router = express.Router();
    var scanner = require('../scanner');
    var plugs = require('../plugs');
    var firstTime = true;

  /* GET home page. */
    router.get('/', function (req, res, next) {
        res.render('index', {plugs: plugs.activePlugs});
        if (firstTime) {
            scanner.networkScanner(socket_io_server, plugs);
            firstTime = false;
        }
    });

    return router;
};