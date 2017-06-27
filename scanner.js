/**
 * Created by vmcb on 02-06-2017.
 */
exports.networkScanner = function(socket_io_server, plugs){
    var mdns = require('mdns');
    var io = require('socket.io-client');
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

    /**
     * Fired when a new host is detected.
     * In this case we filter to detect only plugs
     */
    browser.on('serviceUp', function(service) {
        if(service.host.substring(0, 4) === "plug") {
               var plugObject = {name:service.host.substring(0, service.host.length - 1)};
            try {
                

                // Creates a websocket with the plug
                plugObject['socketVariable'] = io.connect('http://' + plugObject['name'] + ':5000',{'reconnectionAttempts': 3});

                // When a good  connection is established add the plug to the memory
                plugObject['socketVariable'].on('connect',function(data){
                   console.log("A new plug is on: ", service.host.substring(0, service.host.length - 1) + "");
                    console.log("The length before adding" + plugs.activePlugs.length);
                socket_io_server.emit("new_plug", plugObject);
                    plugObject['socketVariable'].emit('event',{data:'Im connected'});
                    plugs.activePlugs.push(plugObject);
                    console.log("The length after adding " + plugs.activePlugs.length);
                });

                // After 3 failed reconnection attempts removes the plug from the memory
                plugObject['socketVariable'].on('reconnect_failed',function(data){
                    plugs.findAndRemove('name',plugObject['name']);
                });

                // Start an heartbeat listener
                plugObject['socketVariable'].on('heartbeat',function(data){
                    //onsole.log("Received an HeartBeat");
                    //console.log(data);
                    var plugState = plugs.getPlug(data.hostname + '.local');
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

    /**
     * When a host comes down and if it's a plug remove it from the memory
     */
    browser.on('serviceDown', function(service) {
        if(service.name.substring(0,4) === "plug") {
            console.log("", service.name + ".local" + " is now disconnected.");
            plugs.findAndRemove('name',service.name + ".local");
            //console.log("There are " + activePlugs.length  + " active plugs")
        }else {
            //console.log("Ignoring Device" + service.name);
        }
    });

    browser.start();
};
