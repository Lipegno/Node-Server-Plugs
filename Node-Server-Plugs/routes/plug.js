module.exports = function(socket_io) {
    var express = require('express');
    var router = express.Router();
    var plugs = require('../plugs');
    var timeThresholdToIgnoreRequests = 5;
    var default_colors = [
        {red:0,green:0,blue:255},
        {red:0,green:255,blue:0},
        {red:0,green:255,blue:255},
        {red:255,green:0,blue:0},
        {red:255,green:0,blue:255},
        {red:255,green:255,blue:0},
        {red:255,green:255,blue:255}
    ];
    var actual_color_position = Math.floor(Math.random() * default_colors.length);
    var initial_led_position = Math.floor(Math.random() * plugs.LED_NUM);
    var default_velocity = 200;
    var num_targets = 5;

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

    router.get('/start', function (req, res) {
        if(plugs.activePlugs.length > 0) {
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                var velocity = default_velocity;
                var leds = [{}];

                //leds[0].position = (Math.floor(Math.random() * 12) + 6) % 12; This can't ensure that every single plug will have a different initial position

                leds[0].position = initial_led_position%plugs.LED_NUM;
                initial_led_position+=2;

                //This ensure that each plug will rotate to different sides and starts in different positions
                if(i%2 === 0 ) { // Odd or even
                    leds[0].orientation = 1;//Math.floor(Math.random() * 2) + 1;
                }else{
                    leds[0].orientation = 2;
                }
                randomizeColor(leds[0]);

                var initconfigs = plugs.initConfig(leds, velocity);
                if (plugs.activePlugs[i].socketVariable) {
                    if (!initializeLeds(plugs.activePlugs[i], initconfigs, leds)) {
                        res.sendStatus(500);
                        break;
                    }
                }
            }
            res.sendStatus(200);
        }else{
            //The request should be ignored no socket is on
            res.sendStatus(500);
        }
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
            if(initializeLeds(plugState,initConfigs,req.body.leds)) {
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
            if (stopLeds(plugState)) {
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        }
        catch (ex) {
            res.sendStatus(500);
        }
    });

    router.get('/:plugId/selected/', function (req,res) {
        var numLedSpinRight = 0;
        var numLedSpinLeft = 0;
        var localLedStandartPosition = Math.floor(Math.random() * 12);
        var plugId = req.params.plugId;
        plugs.activePlugs.forEach(function (element, index) {
            stopLeds(element);
            if(element.name === "plug" + plugId + ".local") {
                var velocity = default_velocity;
                leds = [];

                for(i = 0; i < num_targets; i++){
                    led = {};
                    led.position = localLedStandartPosition%12;
                    led.orientation = Math.floor(Math.random() * 2) + 1;
                    randomizeColor(led);
                    if(led.orientation === 1){
                        //Force LED to spin to other side
                        numLedSpinRight +=1;
                        if(numLedSpinRight === Math.floor(num_targets/2)){
                            led.orientation = 2;
                            numLedSpinRight -=1;
                            numLedSpinLeft +=1;
                        }
                    }else if(led.orientation === 2){
                        numLedSpinLeft +=1;
                        //Force LED to spin to other side
                        if(numLedSpinLeft === Math.floor(num_targets/2)) {
                            led.orientation = 1;
                            numLedSpinLeft -= 1;
                            numLedSpinRight += 1;
                        }
                    }




                    leds.push(led);
                    localLedStandartPosition = localLedStandartPosition + 4;
                }

                /*
                for (i = 0; i < num_targets; i++) {
                    led = {};
                    led.position = localLedStandartPosition%12;
                    led.orientation = Math.floor(Math.random() * 2) + 1;

                    if(led.orientation === 1){
                        //Force LED to spin to other side
                        numLedSpinRight +=1;
                        if(numLedSpinRight === num_targets){
                            led.orientation = 2;
                            numLedSpinRight -=1;
                            numLedSpinLeft +=1;
                        }
                    }else if(led.orientation === 2){
                        numLedSpinLeft +=1;
                        //Force LED to spin to other side
                        if(numLedSpinLeft === num_targets) {
                            led.orientation = 1;
                            numLedSpinLeft -= 1;
                            numLedSpinRight += 1;
                        }
                    }
                    randomizeColor(led);
                    leds.push(led);
                    localLedStandartPosition+=4;
                }
                */


                var initconfigs = plugs.initConfig(leds, velocity);
                initializeLeds(element, initconfigs, leds);
            }
        });
        res.status(200).send("Plug initialized with " + num_targets + " targets.");
    });


    router.get('/:plugId/selected/:ledId',function(req,res){
        var plugId = req.params.plugId;
        var plugName = 'plug'+plugId+'.local';
        var ledId = req.params.ledId;
        try {
            var plugState = plugs.getPlug(plugName);
            var returnCode = selectedLed(plugState, ledId);
            res.status(returnCode.status).send(returnCode.message);
        }
        catch (ex){
            res.status(500).send(ex);
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

    function initializeLeds(plugState, initConfigs,leds) {
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('initConfig', initConfigs);         //Send startUp Data
            Object.assign(plugState, plugState, initConfigs);
            //plugState.initStateSet = 1;                                      //Plug has got it's startup Data
            plugState.initTime = Date.now() / 1000;
            plugState.lastRequest = Date.now() / 1000;
            plugState.leds = leds;
            return true;
        } else {
            return false;
        }
    }

    function stopLeds(plugState) {
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('stop', {"stop": true});
            delete plugState.leds;
            return true;
        } else {
            return false;
        }
    }

    function selectedLed(plugState, ledId) {
        if(ledId > num_targets){
            return {status: 404, message: "The selected Led does not exist."};
        }
        if(Date.now()/1000 - plugState.lastRequest < timeThresholdToIgnoreRequests ){
            return {status:200, message:"Ignoring Requests"};
        }else {
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('selected', {"led": ledId});
                plugState.lastRequest = Date.now() / 1000;
                return {status:200, message:"OK"};
            } else {
                return {status:500, message: "WebSocket is not Open"};
            }
        }
    }

    function randomizeColor(led) {
        var color = default_colors[actual_color_position % default_colors.length];
        actual_color_position++;
        led.red = color.red;
        led.green = color.green;
        led.blue = color.blue;
    }
};