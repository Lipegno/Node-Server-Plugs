/**
 * Created by vmcb on 02-06-2017.
 */
var newLeds = "" +
    "<div>" +
    "<label>LED:" +
    "<input name='position' class='position'>" +
    "<label>Orientation:</label>" +
    "<input name='orientation' class='orientation'>" +
    "<label>Red:</label>" +
    "<input name='red' class='red'>" +
    "<label>Green:</label>" +
    "<input name='green' class='green'>" +
    "<label>Blue:</label>" +
    "<input name='blue' class='blue'>" +
    "<button class='removeLED'>Remove LED</button>" +
    "<br>" +
    "</div>";

function addNewPlugForm(plugName) {
    return "" +
        "<div>" +
            "<p>Device name:"+ plugName +"</p>" +
            "<div>" +
                "<label>LED:</label>" +
                "<input name='position' class='position'>" +
                "<label>Orientation:</label>" +
                "<input name='orientation' class='orientation'>" +
                "<label>Red:</label>" +
                "<input name='red' class='red'>" +
                "<label>Green:</label>" +
                "<input name='green' class='green'>" +
                "<label>Blue:</label>" +
                "<input name='blue' class='blue'>" +
                "<button class='add'> Add more LEDs</button>" +
                "<br>" +
            "</div>" +
            "<div>" +
                "<label>Velocity:</label> " +
                "<input name='velocity' class='velocity'>" +
            "</div>" +
            "<div>" +
                "<button class='configure'>Configure Movements</button>" +
                "<button class='stop'> Stop Movements</button>" +
            "</div>" +
        "</div>";
}
$().ready(function () {
    var socket = io(location.protocol + "//" + location.host);
    socket.on('new_plug', function (data) {
        $("#plugs").append(addNewPlugForm(data.name));
    });

    $(".add").click( function (e) {
        $(this).parent().prev().prev().append(newLeds);
    });

    $(".configure").click(function (e) {
        var leds = [];
        $(this).parent().parent().find(".position").each(function (index, elem) {
            var position = $(elem);
            var orientation = $(elem).next().next();
            var red = orientation.next().next();
            var green = red.next().next();
            var blue = green.next().next();
            leds.push({position:position.val(),orientation:orientation.val(),red:red.val(),green:green.val(),blue:blue.val()})
        });
        var velocity = parseInt($(this).parent().prev().find(".velocity").val());
        var data = {leds:leds,velocity:velocity};
        $.post('/plug/'+$(this).parent().prev().find(":hidden").val().match(/\d+/)[0],data);
    });

    $(".stop").click(function (e) {
        $.post('/plug/'+$(this).parent().prev().find(":hidden").val().match(/\d+/)[0]+'/stopLeds');
    });

    $(document).on("click", ".removeLED", function (e) {
        console.log("click");
        console.log($(this).parent());
        $(this).parent().empty();
    });

});