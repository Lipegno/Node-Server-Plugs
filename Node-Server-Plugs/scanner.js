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

    browser.on('serviceUp', function(service) {
        if(service.host.substring(0, 4) === "plug") {
            console.log("A new plug is on: ", service.host.substring(0, service.host.length - 1) + "");
            var plugObject = {name:service.host.substring(0, service.host.length - 1)};
            try {
                console.log("The length before adding" + plugs.activePlugs.length);
                socket_io_server.emit("new_plug", plugObject);
                plugObject['socketVariable'] = io.connect('http://' + plugObject['name'] + ':5000');
                plugs.activePlugs.push(plugObject);
                console.log("The length after adding " + plugs.activePlugs.length);

                plugObject['socketVariable'].on('connect',function(data){
                    plugObject['socketVariable'].emit('event',{data:'Im connected'});
                });

                /*Start an heartbeat listener*/
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
