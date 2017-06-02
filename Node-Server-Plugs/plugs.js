/**
 * Created by vmcb on 02-06-2017.
 */
exports.LED_NUM = 12;

exports.activePlugs = [{name:"plug2"}, {name:"plug1"}];

exports.initConfig = function (leds, velocity){
    /*  Initial Config Manager  */
    var relayState = 1;
    var personNear = 1;
    return {'leds': leds, 'delay':velocity, 'relayState': relayState,'personNear':personNear};
};

exports.findAndRemove = function(property, value) {
    exports.activePlugs.forEach(function(result, index) {
        console.log("Active Plugs " + result[property]);
        if(result[property] === value) {
            result['socketVariable'].disconnect('unauthorized'); // Closes the socket
            var removedItems = exports.activePlugs.splice(index, 1);
            console.log("There are " + exports.activePlugs.length + " active plugs ");
        }
    });
};

exports.getPlug = function(plugName) {
    for (var i = 0; i < exports.activePlugs.length; i++) {
        if (exports.activePlugs[i].name === plugName) {
            return exports.activePlugs[i];
        }
    }
};