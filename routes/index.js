module.exports = function(plugs) {
    var express = require('express');
    var router = express.Router();

  /**
   *  GET home page.
   */
    router.get('/', function (req, res, next) {
        var m_plugs = [];
        for (var i = 0; i < plugs.activePlugs.length; i++) {
            m_plugs.push({
                name: plugs.activePlugs[i].name,
                velocity: plugs.activePlugs[i].delay,
                leds: plugs.activePlugs[i].leds
            })
        }
        res.render('index', {plugs: m_plugs});
    });

    return router;
};