module.exports = function(socket_io) {
    var express = require('express');
    var router = express.Router();
    var plugs = require('../plugs');

    var timeThresholdToIgnoreRequests = 5; // Time in seconds while requests from the same source are ignored.

    // Default colors used in the LEDs
    var default_colors = [
        {red:0,green:0,blue:255},
        {red:0,green:255,blue:0},
        {red:0,green:255,blue:255},
        {red:255,green:0,blue:0},
        {red:255,green:0,blue:255},
        {red:255,green:255,blue:0},
        {red:255,green:255,blue:255}
    ];

    // Index used to select the next color to be associated to the LED
    var actual_color_position = Math.floor(Math.random() * default_colors.length);

    // Randomly generates a LED to start the movement
    var initial_led_position = Math.floor(Math.random() * plugs.LED_NUM);

    // Default value for velocity (delay between LED transition)
    var default_velocity = 200;

    // Default Number of Targets
    var num_targets = 5;

    // Variable to control if the plugs are making the initial movement or not
    var initialMovementStarted = false;

    /**
     * Returns an array with all LEDs moving and it's corresponding plug name.
     */
    router.get('/', function (req, res) {
        var m_plugs = [];
        for (var i = 0; i < plugs.activePlugs.length; i++) {
            if (typeof plugs.activePlugs[i].leds !== "undefined") {
                led = calculatePosition(plugs.activePlugs[i])[0];
                led.name = plugs.activePlugs[i].name
                m_plugs.push(led);
            } else {
                m_plugs.push({name:plugs.activePlugs[i].name});
            }
        }
        res.json(m_plugs);
    });

    /**
     * Starts the movement of a LED in all active plugs.
     */
    router.get('/start/:numtarget', function (req, res) {
        num_targets = req.params.numtarget;
        if(plugs.activePlugs.length > 0) {
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                stopLeds(plugs.activePlugs[i]);
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
                    var initialization = initializeLeds(plugs.activePlugs[i], initconfigs, leds, false);
                    if (initialization.status !== 200) {
                        res.status(initialization.status).send(initialization.send);
                        break;
                    }
                }
            }
            initialMovementStarted = true;
            res.sendStatus(200);
        }else{
            //The request should be ignored no socket is on
            res.status(500).send("There are no sockets available");
        }
    });


    /**
     * Returns an array with all the LEDs turned on on the given plug
     */
    router.get('/:plugid(\\d+)', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        if (plugs.activePlugs.length > 0) {
            var selectedPlug = plugs.getPlug(plugName);
            console.log(selectedPlug.leds);
            if (selectedPlug.leds !== undefined) {
                var leds = calculatePosition(selectedPlug);
                res.json(leds);
            }
            else {
                res.json("The plug has no leds turned on");
            }
        } else {
            res.json("The Plug is disconnected .");
        }
    });

    /**
     * Changes Relay State of the plug
     */
    router.post('/:plugid/relay', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var relayState = parseInt(req.body.state);
        try {
            var plugState = plugs.getPlug(plugName);
            if(plugState) {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('changeRelayState', {"relayState": relayState});
                    plugState.relayState = relayState;
                    res.sendStatus(200);
                } else {
                    res.status(500).send("Websocket not open");
                }
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Changes Orientation
     * NOT USED RIGHT NOW
     */
    /*router.post('/:plugid/orientation', function (req, res) {
     var plugId = req.params.plugid;
     var plugName = 'plug' + plugId + '.local';
     var orientation = parseInt(req.body.orientation);
     try {
     var plugState = plugs.getPlug(plugName);
     if(plugState) {
     if (plugState.socketVariable.connected) {
     plugState.socketVariable.emit('changeOrientation', {"orientation": orientation});
     plugState.orientation = orientation;
     plugState.initTime = Date.now() / 1000;
     res.sendStatus(200);
     } else {
     res.status(500).send("Websocket not open");
     }
     } else {
     res.status(404).send("The selected plug does not exist")
     }
     }
     catch (ex) {
     res.status(500).send(ex);
     }
     });*/

    /**
     * Changes Person Near
     */
    router.post('/:plugid/personNear', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var personNear = parseInt(req.body.personNear);
        try {
            var plugState = plugs.getPlug(plugName);
            if(plugState) {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('changePersonNear', {"personNear": personNear});
                    plugState.personNear = personNear;
                    console.log("Value for person near" + personNear);
                    res.sendStatus(200);
                } else {
                    res.status(500).send("Websocket not open");
                }
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Changes Velocity
     */
    router.post('/:plugid/delay', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var delay = parseInt(req.body.delay);
        try {
            var plugState = plugs.getPlug(plugName);
            if(plugState) {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('changeDelay', {"delay": delay});
                    plugState.delay = delay;
                    res.sendStatus(200);
                } else {
                    res.status(500).send("Websocket not open");
                }
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Initializes LEDs with the configurations present in post parameters
     */
    router.post('/:plugid/', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var initConfigs = plugs.initConfig(req.body.leds,req.body.velocity);
        try {
            var plugState = plugs.getPlug(plugName);
            if(plugState) {
                var initialization = initializeLeds(plugState,initConfigs,req.body.leds, false);
                res.status(initialization.status).send(initialization.message);
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Stop LEDs
     */
    router.post('/:plugid/stopLeds', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        try {
            var plugState = plugs.getPlug(plugName);
            if(plugState) {
                var stopResult = stopLeds(plugState);
                res.status(stopResult.status).send(stopResult.message);
            } else {
                res.status(404).send("The selected plug does not exist");
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Used when a plug is selected
     * Turns off all other plugs LEDs and randomly starts a movement of leds in the selected plug
     */
    router.get('/:plugId/selected/', function (req,res) {
        var plugId = req.params.plugId;
        var plugName = 'plug' + plugId + '.local';
        var plugState = plugs.getPlug(plugName);
        if(plugState) {
            if (initialMovementStarted) {
                initialMovementStarted = false;
                var numLedSpinRight = 0;
                var numLedSpinLeft = 0;
                var localLedStandartPosition = Math.floor(Math.random() * 12);
                console.log("Initial Position is: " + localLedStandartPosition);
                plugs.activePlugs.forEach(function (element, index) {
                    stopLeds(element);
                    if (element.name === "plug" + plugId + ".local") {
                        var velocity = default_velocity;
                        leds = [];
                        for (i = 0; i < num_targets; i++) {
                            led = {};
                            led.position = localLedStandartPosition % 12;
                            led.orientation = Math.floor(Math.random() * 2) + 1;
                            randomizeColor(led);

                            if (led.orientation === 1) {
                                numLedSpinRight += 1;
                                //Avoid Overlaping Leds
                                for(k  = 0; k < leds.length; k++){
                                    if((leds[k].position === led.position && leds[k].orientation === led.orientation )){
                                        led.orientation = 2;
                                        numLedSpinLeft += 1;
                                        numLedSpinRight -= 1;
                                    }
                                }
                                //Num targets excedded?
                                if (numLedSpinRight > Math.ceil(num_targets/2)) {
                                    led.orientation = 2;
                                    numLedSpinRight -= 1;
                                    numLedSpinLeft += 1;
                                }
                            } else if (led.orientation === 2) {
                                numLedSpinLeft +=1;
                                for(k  = 0; k < leds.length; k++){
                                    if((leds[k].position === led.position && leds[k].orientation === led.orientation )){
                                        led.orientation = 1;
                                        numLedSpinRight += 1;
                                        numLedSpinLeft -= 1;
                                    }
                                }
                                if (numLedSpinLeft > Math.ceil(num_targets/2)) {
                                    led.orientation = 1;
                                    numLedSpinRight += 1;
                                    numLedSpinLeft -= 1;
                                }
                            }
                            leds.push(led);
                            localLedStandartPosition += 4;
                        }
                        var initconfigs = plugs.initConfig(leds, velocity);
                        initializeLeds(element, initconfigs, leds, true);
                    }
                });
                res.status(200).send("Plug initialized with " + num_targets + " targets.");
            } else {
                res.status(500).send("You can't select a socket without starting them first. Go to /plug/start.")
            }
        } else {
            res.status(404).send("The selected plug does not exist");
        }
    });

    /**
     * Turns all the LEDs to the color of the selected LED
     */
    router.get('/:plugId/selected/:ledId',function(req,res){
        var plugId = req.params.plugId;
        var plugName = 'plug'+plugId+'.local';
        var ledId = req.params.ledId;
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState.selected) {
                var returnCode = selectedLed(plugState, ledId);
                res.status(returnCode.status).send(returnCode.message);
            } else {
                res.status(500).send("You're trying to access a plug that is not selected");
            }
        }
        catch (ex){
            res.status(500).send(ex);
        }

    });


    /**
     * Add a new fake plug
     * FOR TEST PURPOSES ONLY
     */
    /*router.get('/new', function (req, res) {
     var plugName = "plug" + plugs.activePlugs.length + ".local";
     var plugObject = {name:plugName};
     console.log("The length before adding" + plugs.activePlugs.length);
     socket_io.emit("new_plug", plugObject);
     plugs.activePlugs.push(plugObject);
     console.log("The length after adding " + plugs.activePlugs.length);
     res.sendStatus(200);
     });*/

    return router;

    /**
     * Initializes the plug LEDs with the given configurations
     * @param plugState an Object with all the plug information
     * @param initConfigs configs to be sent to the plug
     * @param leds  array of leds that is going to be turned on
     * @param isSelected (boolean) true if the plug the plug is now selected
     * @returns {*} with status code and message
     */
    function initializeLeds(plugState, initConfigs,leds, isSelected) {
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('initConfig', initConfigs);         //Send startUp Data
            Object.assign(plugState, plugState, initConfigs);
            plugState.selected = isSelected;
            plugState.initTime = Date.now() / 1000;
            plugState.lastRequest = Date.now() / 1000;
            plugState.leds = leds;
            return {status:200, message:"Plug initialized with " + leds.length + " targets."}
        } else {
            return {status:500, message: "WebSocket is not Open"};
        }
    }

    /**
     * Stops the led movements
     * @param plugState
     * @returns {*}
     */
    function stopLeds(plugState) {
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('stop', {"stop": true});
            delete plugState.leds;
            return {status: 200, message: "OK"};
        } else {
            return {status: 500, message: "WebSocket is not Open"};
        }
    }

    /**
     * Handles the the event of selecting on LED
     * @param plugState
     * @param ledId
     * @returns {*}
     */
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

    /**
     * Select the color to be used on the LED
     * @param led
     */
    function randomizeColor(led) {
        var color = default_colors[actual_color_position % default_colors.length];
        actual_color_position++;
        led.red = color.red;
        led.green = color.green;
        led.blue = color.blue;
    }

    /**
     * Simulates and calculates the actual position of the LEDs using the elapsed time.
     * @param selectedPlug
     * @returns {Array}
     */
    function calculatePosition(selectedPlug) {
        var velocity = selectedPlug.delay;
        var initTime = selectedPlug.initTime * 1000; //conversion to seconds
        var leds = [];
        var firstLEDPosition = parseInt(selectedPlug.leds[0].position);
        selectedPlug.leds.forEach(function (result, index) {
            var offset = result.position - firstLEDPosition;
            var baseActualPosition = 0;
            if (result.orientation == 1) {
                baseActualPosition = Math.floor(((Date.now() - initTime) % (velocity * plugs.LED_NUM )) / (velocity));
            }
            else {
                baseActualPosition = (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity) === 0) ? 0 : (plugs.LED_NUM - (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity)));

            }
            var actualPosition = (firstLEDPosition + offset + baseActualPosition) % plugs.LED_NUM;
            leds.push({
                'position': actualPosition,
                'velocity': parseInt(velocity),
                'orientation': parseInt(result.orientation),
                'red': parseInt(result.red),
                'green': parseInt(result.green),
                'blue': parseInt(result.blue)
            })

        });
        return leds;
    }
};