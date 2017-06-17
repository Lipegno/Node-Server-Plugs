/**
 * Created by vmcb on 02-06-2017.
 */
var newLedRow = "" +
    "<div class='row'>" +
        "<div class='col-xs-3'>"+
        "<input name='position' class='form-control position'>" +
        "</div>"+
        "<div class='col-xs-3'>"+
            "<input name='orientation' class='form-control orientation'>" +
        "</div>"+
        "<div class='col-xs-3'>"+
            "<div class='input-group colorpicker-component'>" +
            "<input type='text' value='#00AABB' class='form-control' />" +
            "<span class='input-group-addon'><i></i></span>" +
            "</div>" +
        "</div>"+
        "<div class='col-xs-3'>"+
            "<i class='glyphicon glyphicon-trash'></i>" +
        "</div>"+
    "</div>";


//Adds a new Box;

function addNewPlugForm(plugName) {
    return





}

$().ready(function () {
    var socket = io(location.protocol + "//" + location.host);
    socket.on('new_plug', function (data) {
        $("#plugs").append(addNewPlugForm(data.name));
    });

    //Add  a new Led
    $(".glyphicon-plus").click( function (e) {
        $(this).parent().parent().prev().after(newLedRow);
        //Binds the colorpicker to children
        $(this).parent().parent().prev().children().eq(2).children().colorpicker({
                color: '#AA3399',
                format: 'rgb'
            });
    });

    // Remove a Led
    $(document).on("click", ".glyphicon-trash", function (e) {
        $(this).parent().parent().remove();
    });

    //Sends Data To The Socket
    $(document).on("click",".glyphicon-play",function (e) {
        var leds = [];
        $(this).parent().parent().parent().find(".position").each(function (index, elem) {
            var position = $(elem);
            var orientation = $(elem).parent().next().children();
            var color = $(this).parent().parent().children().eq(2).children().colorpicker("getValue");

            color = color.replace("rgb(","");
            color = color.replace(")","");
            var red = color.split(",")[0];
            var green = color.split(",")[1];
            var blue = color.split(",")[2];
            leds.push({position:position.val(),orientation:orientation.val(),red: red, green: green, blue:blue})
        });
        var velocity = parseInt($(this).parent().parent().children().eq(0).children().eq(0).children().eq(1).val());
        var data = {leds:leds,velocity:velocity};
        $.post('/plug/'+$(this).parent().prev().find(":hidden").val().match(/\d+/)[0],data);
    });

    //Stop Socket Spinning
    $(".glyphicon-stop").click(function (e) {
        $.post('/plug/'+$(this).parent().prev().find(":hidden").val().match(/\d+/)[0]+'/stopLeds');
    });


});