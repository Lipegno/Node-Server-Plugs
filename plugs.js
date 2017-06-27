/**
 * Created by vmcb on 02-06-2017.
 */
exports.LED_NUM = 12;

exports.activePlugs = [];

/**
 * Prepares the initial config to be sent to the plug.
 * @param leds
 * @param velocity
 * @returns {{leds: *, delay: *, relayState: number, personNear: number}}
 */
exports.initConfig = function (leds, velocity){
    /*  Initial Config Manager  */
    var relayState = 1;
    var personNear = 1;
    return {'leds': leds, 'delay':velocity, 'relayState': relayState,'personNear':personNear};
};

/**
 * Find a plug and removes it from the array.
 * @param property
 * @param value
 */
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

/**
 * Returns the plug with the given name.
 * @param plugName
 * @returns {*}
 */
exports.getPlug = function(plugName) {
    for (var i = 0; i < exports.activePlugs.length; i++) {
        if (exports.activePlugs[i].name === plugName) {
            return exports.activePlugs[i];
        }
    }
    return false;
};