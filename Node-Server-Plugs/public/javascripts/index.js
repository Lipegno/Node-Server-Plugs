/**
 * Created by vmcb on 02-06-2017.
 */

var newLedRow = "" +
    "<div class='row'>" +
        "<div class='col-xs-3'>" +
            "<div class='form-group'>" +
                "<input type='number' min='0' max='12' name='position' class='form-control position' data-position data-position-error='You should choose a new position' data-error='You should add a number between 0 and 12' required>" +
                "<div class='help-block with-errors'></div>" +
            "</div>"+
        "</div>"+
        "<div class='col-xs-3'>"+
            "<div class='form-group'>" +
                "<select name='orientation' class='form-control orientation' data-error='You should select one of the options' required>" +
                    "<option value='1'>Right</option>" +
                    "<option value='2'>Left</option>" +
                "</select>" +
                "<div class='help-block with-errors'></div>" +
            "</div>" +
        "</div>"+
        "<div class='col-xs-3'>"+
            "<div class='form-group'>" +
                "<div class='input-group colorpicker-component'>" +
                    "<input type='text' value='#00AABB' class='form-control' data-error='You should select one color' required/>" +
                    "<span class='input-group-addon'><i></i></span>" +
                "</div>" +
                "<div class='help-block with-errors'></div>" +
            "</div>" +
        "</div>"+
        "<div class='col-xs-3'>"+
            "<i class='glyphicon glyphicon-trash'></i>" +
            "<div class='help-block with-errors'></div>" +
        "</div>"+
    "</div>";


//Adds a new Box;

function addNewPlugForm(plugName) {
    return""+
        "<div class='panel panel-default'>" +
            "<div class='panel-heading'>" +
                "<h4 class='panel-title'>" +
                    "<a data-toggle='collapse'  data-parent='#accordion' href='#collapse" + plugName.substr(0, plugName.length - 6) + "'>Device Name:" + plugName.substr(0, plugName.length - 6) + "</a>" +
                "</h4>" +
            "</div>" +
        "<div id='collapse" + plugName.substr(0, plugName.length - 6) + "' class='panel-collapse collapse'>" +
            "<div class='panel-body'>" +
                "<div class='row'>" +
                    "<div class='col-xs-3'><label> Initial Position </label></div>" +
                    "<div class='col-xs-3'><label> Orientation </label></div>" +
                    "<div class='col-xs-3'><label> Color </label></div>" +
                    "<div class='col-xs-3'><label> Remove </label></div>" +
                "</div>" +
                "<form data-toggle='validator' role='form' method='post' action='/plug/" + plugName.match(/\d+/)[0] + "'>" +
                    "<div class='row'>" +
                        "<div class='col-xs-6'>" +
                            "<div class='form-group'>" +
                                "<label></label>" +
                                "<input type='number' min=50 max=2000 placeholder='Velocity' data-error='Please insert a number between 50 and 2000'  class='velocity has-feedback form-control' required>" +
                                "<div class='help-block with-errors'></div>" +
                            "</div>" +
                        "</div>" +
                        "<div class='col-xs-6'>" +
                            "<span class='glyphicon glyphicon-plus' aria-hidden='true'></span>" +
                            "<span class='glyphicon glyphicon-stop' aria-hidden='true'></span>" +
                            "<span class='glyphicon glyphicon-play' aria-hidden='true'></span>" +
                        "</div>" +
                    "</div>" +
                "</form>" +
            "</div>" +
        "</div>"
}

$().ready(function () {
    $("form").validator({
        custom: {
            'position': function (el) {
                var occurences = 0;
                $(el).closest("form").find(".row").each(function(index,element) {
                    if($(el).val() == $(element).find(".position").val()) {
                        occurences++;
                    }
                });
                console.log(occurences);
                if (occurences > 1) {
                   return "You should insert a new position.";
                }
            }
        }
    });

    var socket = io(location.protocol + "//" + location.host);
    socket.on('new_plug', function (data) {
        $("#plugs").append(addNewPlugForm(data.name));
        $("form").last().children().before(newLedRow);
        $("form").last().children().children().eq(2).children().colorpicker({
            color: '#AA3399',
            format: 'rgb'
        }).validator('update');
    });

    $(plugs).each(function (index, element) {
        console.log(element);
        var form = $("#collapseplug" + element.name.match(/\d+/)[0]).children().find("form");
        console.log(form);
        if (typeof element.leds !== "undefined") {
            console.log(element.leds);
            console.log("está defined");
            $(element.leds).each(function (index, element) {
                form.find('.velocity').parent().parent().parent().before(newLedRow);
                form.find('.velocity').parent().parent().parent().prev().find('.position').val(element.position);
                form.find('.velocity').parent().parent().parent().prev().find('.orientation').val(element.orientation);
                form.find('.velocity').parent().parent().parent().prev().find('.colorpicker-component').colorpicker({
                    color: "rgb(" + element.red + "," + element.green + "," + element.blue+")",
                    format: 'rgb'
                })
            });
            form.find(".glyphicon-play").css("color","gray");
        }
        else {
            console.log("ainda n foi config");
            console.log(form.children());
            form.children().before(newLedRow);
            form.children().children().eq(2).children().colorpicker({
                color: '#AA3399',
                format: 'rgb'
            });
            form.find(".glyphicon-stop").css("color","gray");
        }
        form.validator('update');
    });

    //Add  a new Led
    $(document).on("click", ".glyphicon-plus", function (e) {
        var num_leds = $(this).closest("form").find(".position").length;
        if(num_leds < 12) {
            $(this).parent().parent().before(newLedRow);
            //Binds the colorpicker to children
            $(this).parent().parent().prev().children().eq(2).children().colorpicker({
                color: '#AA3399',
                format: 'rgb'
            });
            $(this).parent().parent().parent().validator('update');
        }
        if (num_leds === 11) {
            $(this).css("color","gray");
        }
    });

    // Remove a Led
    $(document).on("click", ".glyphicon-trash", function (e) {
        var form = $(this).parent().parent().parent();
        var num_leds = $(form).find(".position").length;
        if ($(form).find(".position").length === 1) {
            $(this).next().text("You should have at least one LED");
        } else {
            $(this).parent().parent().remove();
            if(num_leds - 1 < 12) {
                $(form).find(".glyphicon-plus").css("color","#333");
            }
            form.validator('update');
        }
    });

    //Sends Data To The Socket
    $(document).on("click",".glyphicon-play",function (e) {
        $(this).parent().parent().parent().validator('validate');
        form = $(this).closest("form")
        var plug = $.grep(plugs, function(e){ return e.name == form.attr('action').replace(/\//g,"")+".local"; });
        console.log(plug);
        if (plug[0].leds === undefined) {
            console.log("going to submit");
            $(this).parent().parent().parent().submit();
        }
        else {
            console.log($(this).closest(".row"));
            $(this).closest(".row").after("" +
                "<div class='row movement-configured-error'>" +
                "<p class='text-danger'>The LEDs are already spining. You need to stop them before changing their movement.</p>" +
                "</div>")
        }
    });

    $(document).on("submit","form",function (e) {
        if (e.isDefaultPrevented()) {
            // handle the invalid form...
            console.log("validation wrong");
        } else {
            e.preventDefault();
            // everything looks good!
            form = $(this);
            var leds = [];
            $(this).find(".position").each(function (index, elem) {
                var position = $(elem);
                var orientation = $(elem).parent().parent().next().children().children();
                console.log(orientation);
                var color = $(elem).parent().parent().next().next().children().colorpicker("getValue");

                color = color.replace("rgb(", "");
                color = color.replace(")", "");
                var red = color.split(",")[0];
                var green = color.split(",")[1];
                var blue = color.split(",")[2];
                leds.push({
                    position: position.val(),
                    orientation: orientation.val(),
                    red: red,
                    green: green,
                    blue: blue
                });
            });
            var velocity = parseInt($(this).find(".velocity").val());
            $(plugs).each(function(index, element) {
                console.log(form.attr('action').replace(/\//g,"")+".local");
                if(element.name == form.attr('action').replace(/\//g,"")+".local") {
                    element.velocity = velocity;
                    element.leds = leds;
                }
            });
            console.log(plugs);
            var data = {leds: leds, velocity: velocity};
            $.post($(this).attr('action'), data, function (data) {
                form.find(".glyphicon-play").css("color","gray");
                form.find(".glyphicon-stop").css("color","#333");
            });
        }
    });

    //Stop Socket Spinning
    $(document).on("click", ".glyphicon-stop", function (e) {
        var form = $(this).closest("form");
        var playIcon = $(this).prev();
        var stopIcon = $(this);
        var plug = $.grep(plugs, function(e){ return e.name == form.attr('action').replace(/\//g,"")+".local"; });
        if (plug.leds === undefined) {
            form.find(".movement-configured-error").remove();
            $(plugs).each(function(index, element) {
                console.log(form.attr('action').replace(/\//g,"")+".local");
                if(element.name == form.attr('action').replace(/\//g,"")+".local") {
                    delete element.velocity;
                    delete element.leds;
                }
            });
            $.post($(this).parent().parent().parent().attr('action') + '/stopLeds', function (data) {
                console.log(playIcon);
                playIcon.css("color", "#333");
                stopIcon.css("color", "gray");
            });
        }
    });
});