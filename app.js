var express = require('express');
var WebSocket = require('ws');
var bodyParser = require('body-parser');
var mdns = require('mdns');
var io = require('socket.io-client');


//var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var cookieParser = require('cookie-parser');

var app = express();
var wss = new WebSocket.Server({ port: 8080 });

var port = process.env.PORT || 7777; //API Rest Port
var router = express.Router();
var LED_NUM = 12;

var activePlugs = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use('/plug', router); //Adds Prefix on every api url
app.use(function(req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");

    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    next();

});
app.listen(port);
console.log("Server is listening on port: " +port);

networkScanner(); // Starts a network monitor

//velocidade, posição inicial
app.get('/plug/:plugid',function(req,res){
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    if(activePlugs.length > 0) {
        var selectedPlug = getPlug(plugName);
        var velocity = selectedPlug.delay;
        var initTime = selectedPlug.initTime * 1000; //conversion to seconds
        var orientation = selectedPlug.orientation;
        var pattern_2 = selectedPlug.pattern_2;

        if (selectedPlug.orientation === 1) {
            res.json({
                'position': Math.floor(((Date.now() - initTime) % (velocity * 12 )) / (velocity)),
                'velocity': parseInt(velocity),
                'orientation': parseInt(orientation),
                'pattern_2':pattern_2
            });
        }else{
            res.json({
                'position':  (Math.floor(((Date.now()- initTime) % (velocity * 12)) / velocity) === 0) ? 0 : (LED_NUM - (Math.floor(((Date.now()/1000 - initTime) % (velocity * 12)) / velocity))),
                'velocity': parseInt(velocity),
                'orientation': parseInt(orientation),
                'pattern_2':pattern_2
            });
        }
    }else{
        res.json("The Plug is disconnected .");
    }
});

/*Changes Relay State*/
app.post('/plug/:plugid/relay', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var relayState =  parseInt(req.body.state);
    try {
        //Creates a new socket
        var plugState = getPlug(plugName);
        if(plugState.socketVariable.connected){
            plugState.socketVariable.emit('changeRelayState',{"relayState":relayState});
            plugState.relayState = relayState;
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }
    catch (ex){
        res.sendStatus(500);
    }
});

/*Changes Oriention*/
app.post('/plug/:plugid/orientation', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var orientation = parseInt(req.body.orientation);
    try {
        //Creates a new socket
        var plugState = getPlug(plugName);
        if(plugState.socketVariable.connected){
            plugState.socketVariable.emit('changeOrientation',{"orientation": orientation});

            plugState.orientation = orientation;
            plugState.initTime = Date.now()/1000;
            res.sendStatus(200);
        }else{
			res.sendStatus(500);
        }
    }
    catch (ex){
        console.log("Exception" + ex);
        res.sendStatus(500);
    }
});

/*Changes Position
app.post('/plug/:plugid/position', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var position = parseInt(req.body.position);
    try {
        var plugState = getPlug(plugName);
        if(plugState.plugSocketState){
            plugState.socketVariable.emit('changePosition',{"position": position});
            plugState.position = position;
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
        res.sendStatus(200);
    }
    catch (ex){
        res.sendStatus(500);
    }
});
*/

/*Changes Person Near*/
app.post('/plug/:plugid/personNear', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var personNear = parseInt(req.body.personNear);
    try {
        var plugState = getPlug(plugName);
        if(plugState.socketVariable.connected){
            plugState.socketVariable.emit('changePersonNear',{"personNear": personNear});
            plugState.personNear = personNear;
            console.log("Value for person near" + personNear);
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }
    catch (ex){
        res.sendStatus(500);
    }
});

/*Changes Velocity*/
app.post('/plug/:plugid/delay', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var delay = parseInt(req.body.delay);
    try {
        //Creates a new socket
        var plugState = getPlug(plugName);
        if(plugState.socketVariable.connected){
            plugState.socketVariable.emit('changeDelay',{"delay": delay});
            plugState.delay = delay;
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }
    catch (ex){
        res.sendStatus(500);
    }
});

app.get('/plug/:plugid/selected',function(req,res){
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';

    try {
        //Creates a new socket
        var plugState = getPlug(plugName);
        if(plugState.socketVariable.connected){
            plugState.socketVariable.emit('selected',{"match": true});
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }
    catch (ex){
        res.sendStatus(500);
    }

});

function initConfig(){
    /*  Initial Config Manager  */
    var position  = activePlugs.length;

    var orientation;

    if(activePlugs.length >= 11) {
        orientation = 2;
    }else{
        orientation = 1;
    }

    orientation = 1;
    var delay = 500;
    var relayState = 1;
    var personNear = 1;

    pattern_2 = 5;

    return {'orientation': orientation,'position': position, 'delay':delay,'relayState': relayState,'personNear':personNear, 'pattern_2': pattern_2};
}

function networkScanner(){
    /*  Network Scanner and gives socket it's initial configs   */
   console.log("Starting Monitoring Service");

    var sequence = [
        mdns.rst.DNSServiceResolve()
        , mdns.rst.getaddrinfo({families: [4] })
    ];

    try{
        var browser = mdns.createBrowser(mdns.tcp('http'),{resolverSequence: sequence});
    } catch (ex) {
        console.log('Something went wrong creating the webSocket' + ex)
    }

    browser.on('serviceUp', function(service) {
        if(service.host.substring(0, 4) === "plug") {
            console.log("A new plug is on: ", service.host.substring(0, service.host.length - 1) + "");
            var plugObject = {name:service.host.substring(0, service.host.length - 1)};
            var initConfigs = initConfig();
            try {
                console.log("The length before adding" + activePlugs.length);
                plugObject['socketVariable'] = io.connect('http://' + plugObject['name'] + ':5000');
                //plugObject['socketVariable'] = plugObject['socketVariable'].connect();
                plugObject['socketVariable'].emit('initConfig',initConfigs);         //Send startUp Data
	            Object.assign(plugObject, plugObject, initConfigs);
	            plugObject['initStateSet'] = 1;                                      //Plug has got it's startup Data
	            plugObject['initTime'] = Date.now()/1000;
	            activePlugs.push(plugObject);
	            console.log("The length after adding " + activePlugs.length);

                plugObject['socketVariable'].on('connect',function(data){
                    plugObject['socketVariable'].emit('event',{data:'Im connected'});
                });

	            /*Start an heartbeat listener*/
	            plugObject['socketVariable'].on('heartbeat',function(data){
	                console.log("Received an HeartBeat");
	                console.log(data);
                    var plugState = getPlug(data.hostname + '.local');
                    plugState.initTime = data.timestamp;
                    });
            }
            catch (ex){
                console.log("Socket is wrong" + ex);
            }

        }else{
            console.log("You're trying to add a device that is not a plug. ")
        }
    });

    browser.on('error', function(error) {
        //console.log('An error occured: ' + error);
    });

    browser.on('serviceDown', function(service) {
        if(service.name.substring(0,4) === "plug") {
            console.log("", service.name + ".local" + " is now disconnected.");
            findAndRemove('name',service.name + ".local");
            //console.log("There are " + activePlugs.length  + " active plugs")
        }else {
            //console.log("Ignoring Device" + service.name);
        }
    });

    browser.start();
}


function findAndRemove(property, value) {
    activePlugs.forEach(function(result, index) {
        console.log("Active Plugs " + result[property]);
        if(result[property] === value) {
            result['socketVariable'].disconnect('unauthorized'); // Closes the socket
            var removedItems = activePlugs.splice(index, 1);
            console.log("There are " + activePlugs.length + " active plugs ");
        }
    });
}

function getPlug(plugName) {
    for (var i = 0; i < activePlugs.length; i++) {
        if (activePlugs[i].name === plugName) {
            return activePlugs[i];
        }
    }
}