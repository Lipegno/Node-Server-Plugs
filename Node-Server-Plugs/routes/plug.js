module.exports = function(socket_io) {
    var express = require('express');
    var router = express.Router();
    var plugs = require('../plugs');
    var timeThresholdToIgnoreRequests = 5;

//velocidade, posição inicial
    router.get('/', function (req, res) {
        var m_plugs = [];
        for (var i = 0; i < plugs.activePlugs.length; i++) {
            m_plugs.push({
                name: plugs.activePlugs[i].name,
                velocity: plugs.activePlugs[i].delay,
                leds: plugs.activePlugs[i].leds
            })
        }
        res.json(m_plugs);
    });


    router.get('/:plugid(\\d+)', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        if (plugs.activePlugs.length > 0) {
            var selectedPlug = plugs.getPlug(plugName);
            console.log(selectedPlug.leds);
            if (selectedPlug.leds !== undefined) {
                var velocity = selectedPlug.delay;
                var initTime = selectedPlug.initTime * 1000; //conversion to seconds

                var leds = [];

                var firsLEDtPosition = parseInt(selectedPlug.leds[0].position);
                selectedPlug.leds.forEach(function (result, index) {
                    var offset = result.position - firsLEDtPosition;
                    var baseActualPosition = 0;
                    if (result.orientation == 1) {
                        baseActualPosition = Math.floor(((Date.now() - initTime) % (velocity * plugs.LED_NUM )) / (velocity));
                    }
                    else {
                        baseActualPosition = (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity) === 0) ? 0 : (plugs.LED_NUM - (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity)));

                    }
                    var actualPosition = (firsLEDtPosition + offset + baseActualPosition) % plugs.LED_NUM;
                    leds.push({
                        'position': actualPosition,
                        'velocity': parseInt(velocity),
                        'orientation': parseInt(result.orientation),
                        'red': parseInt(result.red),
                        'green': parseInt(result.green),
                        'blue': parseInt(result.blue)
                    })

                });
                res.json(leds);
            }
            else {
                res.json("The plug has no leds turned on");
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
        var initConfigs = plugs.initConfig(req.body.leds,req.body.velocity);
        try {
            //Creates a new socket
            var plugState = plugs.getPlug(plugName);
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('initConfig',initConfigs);         //Send startUp Data
                Object.assign(plugState, plugState, initConfigs);
                plugState.initStateSet = 1;                                      //Plug has got it's startup Data
                plugState.initTime = Date.now()/1000;
                plugState.lastRequest = Date.now()/1000;
                plugState.leds = req.body.leds;
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            console.log(ex);
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
                delete plugState.leds;
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    router.get('/:plugId/selected/:ledId',function(req,res){
        var plugId = req.params.plugId;
        var plugName = 'plug'+plugId+'.local';
        var ledId = req.params.ledId;
        try {
            var plugState = plugs.getPlug(plugName);
            if(Date.now()/1000 - plugState.lastRequest < timeThresholdToIgnoreRequests ){
                console.log("Ignoring Requests");
                res.sendStatus(200);
            }else {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('selected', {"led": ledId});
                    res.sendStatus(200);
                    plugState.lastRequest = Date.now() / 1000;
                } else {
                    res.sendStatus(500);
                }
            }
        }
        catch (ex){
            res.sendStatus(500);
        }

    });

    router.get('/new', function (req, res) {
        var plugName = "plug" + plugs.activePlugs.length + ".local";
        var plugObject = {name:plugName};
        console.log("The length before adding" + plugs.activePlugs.length);
        socket_io.emit("new_plug", plugObject);
        plugs.activePlugs.push(plugObject);
        console.log("The length after adding " + plugs.activePlugs.length);
        res.sendStatus(200);
    });

    return router;
};
