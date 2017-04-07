var express = require('express');

//var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');

var WebSocket = require('ws');
var mdns = require('mdns');
var wss = new WebSocket.Server({ port: 8080 });
var activePlugs = [];

networkScanner(); // Starts a network monitor


wss.on('connection', function connection(ws) {
    console.log(ws);
    ws.on('message', function (message) {
        if(message === "heartbeat"){
            heatBeat(position);
        }
        if(message === "position"){
            array.forEach(function(result, index) {
                if(result[property] === value) {
                    //Remove from array
                    array.splice(index, 1);
                }
            });
        }
    });
});


function initConfig(){
    var position  = activePlugs.length;
    var orientation;
    if(activePlugs.length >= 11) {
        orientation = 0;
    }else{
        orientation = 1
    }
    var delay = 100;
    var relayState = 0;
    var personNear = 1;
    return {'orientation': orientation,'position': position, 'delay':delay,'relayState': relayState,'personNear':personNear};
}





function networkScanner(){
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
            var plugObject = {name:service.host.substring(0, service.host.length - 1), 'initStateSet': 0 , 'initTime': Date.now()};
            var initConfigs = initConfig();
            try {
                var plugSocket = new WebSocket('ws://'+plugObject['name']);
                plugSocket.send(initConfigs);      //Send startUp Data
                plugObject = plugObject.concat(initConfigs);
                plugObject['initStateSet'] = 1;     //Plug has got it's startup Data
                plugObject['initTime'] = Date.now();
                console.log(plugObject['initTime']);
            }
            catch (ex){
                console.log(ex);
            }
            activePlugs.push(plugObject);
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
            //Remove from array
            array.splice(index, 1);

        }
    });
}

