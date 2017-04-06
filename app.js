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

    ws.on('message', function (message) {
        if(message === "initconfig") {
            initConfig();
        }else if(message === "heartbeat"){
            heatBeat(position);
        }
    });
});


function initConfig(){
    var position  = activePlugs.length();
    var orientation;
    if(activePlugs.length() >= 11) {
        orientation = 0;
    }else{
        orientation = 1
    }
    var delay = 100;
    var relayState = 0;
    var personNear = 1;
    ws.send({'orientation': orientation,'position': position, 'delay':delay,'relayState': relayState,'personNear':personNear});
}

function heatBeat(position){
}

function networkScanner(){
    console.log("Starting Monitoring Service");
    var sequence = [
        mdns.rst.DNSServiceResolve()
        , mdns.rst.getaddrinfo({families: [4] })
    ];
    try {
    var browser = mdns.createBrowser(mdns.tcp('http'),{resolverSequence: sequence});

    browser.on('serviceUp', function(service) {
        if(service.host.substring(0, 4) === "plug") {
            console.log("A new plug is on: ", service.host.substring(0, service.host.length - 1) + "");
            activePlugs.push(service.host);
        }else{
            console.log("Ignoring Device" + service.host);
        }
    });
    browser.on('serviceDown', function(service) {
        if(service.name.substring(0,4) === "plug") {
            console.log("", service.name + ".local" + " is now disconnected.");
            activePlugs.pop(service.name);
        }else{
            console.log("Ignoring Device" + service.name);
        }
    });

        browser.start();
    }
    catch (e) {
        console.log("An error was detected" + e);
    }
}


function changeRelayState(){
    return relayState;
}

function getPlugCurrentState(){

}

function personNearCheck(){
    return personNear;
}