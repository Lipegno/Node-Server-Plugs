module.exports = function(socket_io) {
    var express = require('express');
    var io = require('socket.io-client');
    var router = express.Router();
    var plugs = require('../plugs');

//velocidade, posição inicial
    router.get('/:plugid', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        if (plugs.activePlugs.length > 0) {
            var selectedPlug = plugs.getPlug(plugName);
            var velocity = selectedPlug.delay;
            var initTime = selectedPlug.initTime * 1000; //conversion to seconds
            var orientation = selectedPlug.orientation;

            if (selectedPlug.orientation === 1) {
                res.json({
                    'position': Math.floor(((Date.now() - initTime) % (velocity * 12 )) / (velocity)),
                    'velocity': parseInt(velocity),
                    'orientation': parseInt(orientation)
                });
            } else {
                res.json({
                    'position': (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity) === 0) ? 0 : (LED_NUM - (Math.floor(((Date.now() / 1000 - initTime) % (velocity * 12)) / velocity))),
                    'velocity': parseInt(velocity),
                    'orientation': parseInt(orientation)
                });
            }
        } else {
            res.json("The Plug is disconnected .");
        }
    });

    /*Changes Relay State*/
    router.post('/:plugid/relay', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var relayState = parseInt(req.body.state);
        try {
            //Creates a new socket
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('changeRelayState', {"relayState": relayState});
                plugState.relayState = relayState;
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    /*Changes Oriention*/
    router.post('/:plugid/orientation', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var orientation = parseInt(req.body.orientation);
        try {
            //Creates a new socket
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('changeOrientation', {"orientation": orientation});

                plugState.orientation = orientation;
                plugState.initTime = Date.now() / 1000;
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            console.log("Exception" + ex);
            res.sendStatus(500);
        }
    });

    /*Changes Person Near*/
    router.post('/:plugid/personNear', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var personNear = parseInt(req.body.personNear);
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('changePersonNear', {"personNear": personNear});
                plugState.personNear = personNear;
                console.log("Value for person near" + personNear);
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    /*Changes Velocity*/
    router.post('/:plugid/delay', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var delay = parseInt(req.body.delay);
        try {
            //Creates a new socket
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('changeDelay', {"delay": delay});
                plugState.delay = delay;
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    /*Initializes LEDs*/
    router.post('/:plugid/', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        console.log(req.body);
        var initConfigs = plugs.initConfig(req.body.leds,req.body.velocity);
        console.log(initConfigs);
        try {
            //Creates a new socket
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('initConfig',initConfigs);         //Send startUp Data
                Object.assign(plugState, plugState, initConfigs);
                plugState.initStateSet = 1;                                      //Plug has got it's startup Data
                plugState.initTime = Date.now()/1000;
                plugState.lastRequest = Date.now()/1000;
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    /*Stop LEDs*/
    router.post('/:plugid/stopLeds', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        try {
            //Creates a new socket
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('stop', {"stop": true});
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    return router;
};
