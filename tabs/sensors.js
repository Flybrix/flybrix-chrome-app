
function initialize_sensors_view() {

    $('#gyroscope-plot').create_plot(["x (deg/sec)", "y (deg/sec)", "z (deg/sec)"]);
    $('#accelerometer-plot').create_plot(["x (g)", "y (g)", "z (g)"]);
    $('#magnetometer-plot').create_plot(["x (Ga)", "y (Ga)", "z (Ga)"]);
    $('#barometer-plot').create_plot(["pressure (Pa)"]);
    $('#temperature-plot').create_plot(["temperature (C)"]);
    $('#battery-plot').create_plot(["voltage (V)", "total current (mA)", "electronics current (mA)", "total power (mW)", "electronics power (mW)"]);

    parser_callback_list.add(update_sensors_view);

    eeprom_refresh_callback_list.add(refresh_sensors_view_from_eepromConfig);
    refresh_sensors_view_from_eepromConfig();
};

function refresh_sensors_view_from_eepromConfig() {
    //nothing yet
};

var last_sensors_view_update = 0;
function update_sensors_view(){
    var now = Date.now();
    if ( (now - last_sensors_view_update) > graph_update_delay ) { //throttle redraw to 20Hz
        var plotq = $("#gyroscope-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("x (deg/sec)", state.timestamp_us / 1000000, state.gyro[0], false);
            plotq.update_flybrix_plot_series("y (deg/sec)", state.timestamp_us / 1000000, state.gyro[1], false);
            plotq.update_flybrix_plot_series("z (deg/sec)", state.timestamp_us / 1000000, state.gyro[2]);
        }
        plotq = $("#accelerometer-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("x (g)", state.timestamp_us / 1000000, state.accel[0], false);
            plotq.update_flybrix_plot_series("y (g)", state.timestamp_us / 1000000, state.accel[1], false);
            plotq.update_flybrix_plot_series("z (g)", state.timestamp_us / 1000000, state.accel[2]);
        }
        plotq = $("#magnetometer-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("x (Ga)", state.timestamp_us / 1000000, state.mag[0], false);
            plotq.update_flybrix_plot_series("y (Ga)", state.timestamp_us / 1000000, state.mag[1], false);
            plotq.update_flybrix_plot_series("z (Ga)", state.timestamp_us / 1000000, state.mag[2]);
        }
        plotq = $("#barometer-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("pressure (Pa)", state.timestamp_us / 1000000, state.pressure);
        }
        plotq = $("#temperature-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("temperature (C)", state.timestamp_us / 1000000, state.temperature);
        }
        plotq = $("#battery-plot");
        if(plotq.find("#live").prop("checked")) {
            var kV0 = (20.5 + 226) / 20.5 * 1.2 / 65536;
            var kI0 = 1000 * (1 / 50) / 0.003 * 1.2 / 65536;
            var kI1 = 1000 * (1 / 50) / 0.03 * 1.2 / 65536;

            plotq.update_flybrix_plot_series("voltage (V)",              state.timestamp_us / 1000000, kV0*state.V0_raw, false);
            plotq.update_flybrix_plot_series("total current (mA)",       state.timestamp_us / 1000000, kI0*state.I0_raw, false);
            plotq.update_flybrix_plot_series("electronics current (mA)", state.timestamp_us / 1000000, kI1*state.I1_raw, false);
            plotq.update_flybrix_plot_series("total power (mW)",         state.timestamp_us / 1000000, kI0*kV0*state.V0_raw*state.I0_raw, false);
            plotq.update_flybrix_plot_series("electronics power (mW)",   state.timestamp_us / 1000000, kI1*kV0*state.V0_raw*state.I1_raw);
        }
        last_sensors_view_update = now;
    }
};
