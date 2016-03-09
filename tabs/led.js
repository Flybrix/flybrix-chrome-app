var updateColors = (function() {
    'use strict';

    function applyRgb(q, r, g, b) {
        q.data("color_r", r);
        q.data("color_g", g);
        q.data("color_b", b);
    }

    function getRgb(q) {
        return {r: q.data("color_r") || 0, g: q.data("color_g") || 0, b: q.data("color_b") || 0};
    }

    function update() {
        var l = getRgb($("#led-left"));
        var r = getRgb($("#led-right"));
        var message = new Uint8Array([
            $("input[name=ledmode]:checked").val(),
            r.r,
            r.g,
            r.b,
            l.r,
            l.g,
            l.b,
            $("#led-ind-red").is(":checked"),
            $("#led-ind-grn").is(":checked"),
        ]);
        send_message(CommandFields.COM_SET_LED, message, false);
    }

    var latestUpdate = new Date();

    return function(change_color, query, rgb, wait_update) {
        if (change_color) {
            var newTime = new Date();
            if (wait_update) {
                if (newTime - latestUpdate < 50) {  // up to 20 updates per second
                    return;
                }
            }
            latestUpdate = newTime;
            applyRgb(query, rgb.r, rgb.g, rgb.b);
        };
        update();
    };
}());

function initialize_led_view() {
    $(".led-color")
        .spectrum({
            flat: true,
            preferredFormat: "hex",
            showInput: true,
            showButtons: false,
            color: "black",
            change: function(color) {
                updateColors(true, $(this), color.toRgb(), false);
            },
            move: function(color) {
                updateColors(true, $(this), color.toRgb(), true);
            }
        });

    $("input[name=ledmode]")
        .change(function() {
            updateColors(false);
        });

    $(".led-checkbox")
        .click(function() {
            updateColors(false);
        });
}


function refresh_led_view_from_eepromConfig() {
}
