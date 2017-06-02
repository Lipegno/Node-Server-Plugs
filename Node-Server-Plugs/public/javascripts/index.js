/**
 * Created by vmcb on 02-06-2017.
 */
var newLeds = "" +
    "<label>LED:" +
    "<input name='position' class='position'>" +
    "<label>Orientation:</label>" +
    "<input name='orientation' class='orientation'>" +
    "<br>";

function addNewPlugForm(plugName) {
    return "" +
        "<div>" +
            "<p>Device name: #{plug.name}</p>" +
            "<div>" +
                "<label>LED:</label>" +
                "<input name='position' class='position'>" +
                "<label>Orientation:</label>" +
                "<input name='orientation' class='orientation'>" +
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
        $(this).parent().append(newLeds);
    });

    $(".configure").click(function (e) {
        var leds = [];
        $(this).parent().parent().find(".position").each(function (index, elem) {
            leds.push({position:$(elem).val(),orientation:$(elem).next().next().val()})
        });
        var velocity = $(this).parent().prev().find(".velocity").val();
        var data = {leds:leds,velocity:velocity};
        $.post('/plug/'+$(this).parent().prev().find(":hidden").val().match(/\d+/)[0],data);
    });

    $(".stop").click(function (e) {
        $.post('/plug/'+$(this).parent().prev().find(":hidden").val().match(/\d+/)[0]+'/stopLeds');
    });
});