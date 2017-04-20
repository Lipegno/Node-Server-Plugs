var express = require('express');
var WebSocket = require('ws');
var mdns = require('mdns');
var bodyParser = require('body-parser');
var io = require('socket.io-client');
//var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var cookieParser = require('cookie-parser');
//

var app = express();
var wss = new WebSocket.Server({ port: 8080 });

var port = process.env.PORT || 7777; //API Rest Port
var router = express.Router();


var activePlugs = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use('/plug', router); //Adds Prefix on every api url

app.listen(port);
console.log("Server is listening on port: " +port);

networkScanner(); // Starts a network monitor

//velocidade, posição inicial
app.get('/plug/:plugid',function(req,res){
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    if(activePlugs.length > 0) {
        for(var i = 0; i < activePlugs.length; i++){
            if (activePlugs[i].name === plugName) {
                var velocity = activePlugs[i].delay
                var initTime = activePlugs[i].initTime;
                var orientation = activePlugs[i].orientation;
                break; // don't need to find any more plugs
            }
        }
        console.log(((Date.now() - initTime)%(velocity*12))/velocity);
        res.json({'position':((Date.now() - initTime)%(velocity*12))/velocity, 'velocity': velocity, 'orientation': orientation});
    }else{
        res.json("No plugs are active.");
    }
});

app.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});

/*Changes Relay State*/
app.post('/plug/:plugid/relay', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var state = req.body.state;
    try {
        //Creates a new socket
        var plugSocket = io('http://'+plugName+':5000');
        plugSocket.on('connect',function(){
            plugSocket.emit('changeRelayState',{"relayState": state});
            for(var i = 0; i < activePlugs.length; i++) {
                if (activePlugs[i].name === plugName) {
                    activePlugs[i].relayState = state;
                }
            }
            res.sendStatus(200);
        });
    }
    catch (ex){
        res.sendStatus(500);
    }
});

/*Changes Oriention*/
app.post('/plug/:plugid/orientation', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var orientation = req.body.orientation;
    try {
        //Creates a new socket
        var plugSocket = io('http://'+plugName+':5000');
        plugSocket.on('connect',function(){
            plugSocket.emit('changeOrientation',{"relayState": orientation});
                for(var i = 0; i < activePlugs.length; i++) {
                if (activePlugs[i].name === plugName) {
                    activePlugs[i].orientation = orientation;
                }
            }
            res.sendStatus(200);
        });
    }
    catch (ex){
        res.sendStatus(500);
    }
});

/*Changes Position*/
app.post('/plug/:plugid/position', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var position = req.body.position;
    try {
        //Creates a new socket
        var plugSocket = io('http://'+plugName+':5000');
        plugSocket.on('connect',function(){
            plugSocket.emit('changePosition',{"position": position});
                for(var i = 0; i < activePlugs.length; i++) {
                if (activePlugs[i].name === plugName) {
                    activePlugs[i].position = position;
                }
            }
            res.sendStatus(200);
        });
    }
    catch (ex){
        res.sendStatus(500);
    }
});

/*Changes Person Near*/
app.post('/plug/:plugid/personNear', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var personNear = req.body.personNear;
    try {
        //Creates a new socket
        var plugSocket = io('http://'+plugName+':5000');
        plugSocket.on('connect',function(){
            plugSocket.emit('changePersonNear',{"personNear": personNear});
                for(var i = 0; i < activePlugs.length; i++) {
                if (activePlugs[i].name === plugName) {
                    activePlugs[i].personNear = personNear;
                }
            }
            res.sendStatus(200);
        });
    }
    catch (ex){
        res.sendStatus(500);
    }
});

/*Changes Velocity*/
app.post('/plug/:plugid/delay', function(req, res) {
    var plugId = req.params.plugid;
    var plugName = 'plug'+plugId+'.local';
    var delay = req.body.delay;
    try {
        //Creates a new socket
        var plugSocket = io('http://'+plugName+':5000');
        plugSocket.on('connect',function(){
            plugSocket.emit('changeDelay',{"delay": delay});
            for(var i = 0; i < activePlugs.length; i++) {
                if (activePlugs[i].name === plugName) {
                    activePlugs[i].delay = delay;
                }
            }
            res.sendStatus(200);
        });
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
        orientation = 0;
    }else{
        orientation = 1
    }
    var delay = 255;
    var relayState = 0;
    var personNear = 1;
    return {'orientation': orientation,'position': position, 'delay':delay,'relayState': relayState,'personNear':personNear};
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
            //console.log(service);
            console.log("A new plug is on: ", service.host.substring(0, service.host.length - 1) + "");
            var plugObject = {name:service.host.substring(0, service.host.length - 1), 'initStateSet': 0 , 'initTime': Date.now()};
            var initConfigs = initConfig();
            try {
                //Creates a new socket
                var plugSocket = io('http://'+plugObject['name']+':5000');

                plugSocket.on('connect',function(){
                    plugSocket.emit('initConfig',initConfigs);
                    Object.assign(plugObject, plugObject, initConfigs);
                    console.log(plugObject);
                    plugObject['initStateSet'] = 1;     //Plug has got it's startup Data
                    plugObject['initTime'] = Date.now();
                    activePlugs.push(plugObject);
                });      //Send startUp Data
            }
            catch (ex){
                console.log("Socket is wrong");
            }

        }else{
        }
    });

    browser.on('error', function(error) {
        //console.log('An error occured: ' + error);
    });

    browser.on('serviceDown', function(service) {
        if(service.name.substring(0,4) === "plug") {
            console.log("", service.name + ".local" + " is now disconnected.");
            findAndRemove(activePlugs,'name',service.name + ".local");
            //console.log("There are " + activePlugs.length  + " active plugs")
        }else {
            //console.log("Ignoring Device" + service.name);
        }
    });

    browser.start();
}


function findAndRemove(array, property, value) {
    array.forEach(function(result, index) {
        if(result[property] === value) {
            array.splice(index, 1);
        }
    });
}

