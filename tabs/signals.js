
// order of channels in assignedChannel array is ['THROTTLE','PITCH','ROLL','YAW/RUDDER','AUX 1','AUX 2']

function initialize_signals_view() {
    $('#signals-plot').create_plot(["CH0 (usec)","CH1 (usec)","CH2 (usec)","CH3 (usec)","CH4 (usec)","CH5 (usec)"]);

    $('#commands-master-plot').create_plot(["Fz (m)", "Tx (deg)", "Ty (deg)", "Tz (deg)"]);
    $('#commands-slave-plot').create_plot(["Fz (m/s)", "Tx (deg/s)", "Ty (deg/s)", "Tz (deg/s)"]);
    $('#commands-feedfoward-plot').create_plot(["Tx Trim (pwm counts)", "Ty Trim (pwm counts)", "Tz Trim (pwm counts)"]);
    $('#commands-direct-plot').create_plot(["Fz (pwm counts)", "Tx (pwm counts)", "Ty (pwm counts)", "Tz (pwm counts)"]);
    
    parser_callback_list.add(update_signals_view);

    $('#signals .command-settings-assignedChannel-field').connect_to_eeprom();
    $('#signals .command-settings-commandScaling-field').connect_to_eeprom();
    $('#signals .command-settings-checkbox-inversion').connect_to_eeprom();
    eeprom_refresh_callback_list.add(refresh_signals_view_from_eepromConfig);

	refresh_signals_view_from_eepromConfig();
};


function refresh_signals_view_from_eepromConfig() {

    loadArrayValues($('#signals .command-settings-assignedChannel-field'), eepromConfig.assignedChannel, 0);

	$("#signals .command-settings-checkbox-inversion.0").prop("checked", ((eepromConfig.commandInversion >> 0) & 1))
	$("#signals .command-settings-checkbox-inversion.1").prop("checked", ((eepromConfig.commandInversion >> 1) & 1))
	$("#signals .command-settings-checkbox-inversion.2").prop("checked", ((eepromConfig.commandInversion >> 2) & 1))

	$("#signals .command-settings-commandScaling-field.thrustMasterPIDParameters ").val(eepromConfig.thrustMasterPIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.pitchMasterPIDParameters ").val(eepromConfig.pitchMasterPIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.rollMasterPIDParameters ").val(eepromConfig.rollMasterPIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.yawMasterPIDParameters ").val(eepromConfig.yawMasterPIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.thrustSlavePIDParameters ").val(eepromConfig.thrustSlavePIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.pitchSlavePIDParameters ").val(eepromConfig.pitchSlavePIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.rollSlavePIDParameters ").val(eepromConfig.rollSlavePIDParameters[6].toFixed(4));
	$("#signals .command-settings-commandScaling-field.yawSlavePIDParameters ").val(eepromConfig.yawSlavePIDParameters[6].toFixed(4));
}


var last_signals_view_update = 0;
function update_signals_view() {
    var now = Date.now();
    if ( (now - last_signals_view_update) > graph_update_delay ) { //throttle redraw to 20Hz

        //update AUX mask led indicators
        if (!(state.AUX_chan_mask & 0x0001)) {$('#auxbit00').css('background-color', '#000000');} else {$('#auxbit00').css('background-color', '');}
        if (!(state.AUX_chan_mask & 0x0002)) {$('#auxbit01').css('background-color', '#000000');} else {$('#auxbit01').css('background-color', '');}
        if (!(state.AUX_chan_mask & 0x0004)) {$('#auxbit02').css('background-color', '#000000');} else {$('#auxbit02').css('background-color', '');}
        if (!(state.AUX_chan_mask & 0x0008)) {$('#auxbit03').css('background-color', '#000000');} else {$('#auxbit03').css('background-color', '');}
        if (!(state.AUX_chan_mask & 0x0010)) {$('#auxbit04').css('background-color', '#000000');} else {$('#auxbit04').css('background-color', '');}
        if (!(state.AUX_chan_mask & 0x0020)) {$('#auxbit05').css('background-color', '#000000');} else {$('#auxbit05').css('background-color', '');}
        var plotq = $("#signals-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("CH0 (usec)", state.timestamp_us / 1000000, state.ppm[0], false);
            plotq.update_flybrix_plot_series("CH1 (usec)", state.timestamp_us / 1000000, state.ppm[1], false);
            plotq.update_flybrix_plot_series("CH2 (usec)", state.timestamp_us / 1000000, state.ppm[2], false);
            plotq.update_flybrix_plot_series("CH3 (usec)", state.timestamp_us / 1000000, state.ppm[3], false);
            plotq.update_flybrix_plot_series("CH4 (usec)", state.timestamp_us / 1000000, state.ppm[4], false);
            plotq.update_flybrix_plot_series("CH5 (usec)", state.timestamp_us / 1000000, state.ppm[5]);
        }
  
        var RC_min = 1100;
        var RC_max = 1900;
        var throttle_threshold = ((RC_max - RC_min) / 10) + RC_min;
        
        var Fz_cmd = Math.min(Math.max(parseInt((state.ppm[eepromConfig.assignedChannel[0]] - throttle_threshold) * 4095 / (RC_max - throttle_threshold)), 0), 4095);
        var Tx_cmd = Math.min(Math.max(parseInt((1 - 2 * ((eepromConfig.commandInversion >> 0) & 1)) * (state.ppm[eepromConfig.assignedChannel[1]] - state.ppm_midpoint[0]) * 4095 / (RC_max - RC_min)), -2047), 2047);
        var Ty_cmd = Math.min(Math.max(parseInt((1 - 2 * ((eepromConfig.commandInversion >> 1) & 1)) * (state.ppm[eepromConfig.assignedChannel[2]] - state.ppm_midpoint[1]) * 4095 / (RC_max - RC_min)), -2047), 2047);        
        var Tz_cmd = Math.min(Math.max(parseInt((1 - 2 * ((eepromConfig.commandInversion >> 2) & 1)) * (state.ppm[eepromConfig.assignedChannel[3]] - state.ppm_midpoint[2]) * 4095 / (RC_max - RC_min)), -2047), 2047);
        
        plotq = $("#commands-master-plot");
        if(plotq.find("#live").prop("checked")) {
            var scaleFz = eepromConfig.thrustMasterPIDParameters[6];
            var scaleTx = eepromConfig.pitchMasterPIDParameters[6];
            var scaleTy = eepromConfig.rollMasterPIDParameters[6];
            var scaleTz = eepromConfig.yawMasterPIDParameters[6];

            plotq.update_flybrix_plot_series("Fz (m)",   state.timestamp_us / 1000000, scaleFz * Fz_cmd, false);
            plotq.update_flybrix_plot_series("Tx (deg)", state.timestamp_us / 1000000, scaleTx * Tx_cmd, false);
            plotq.update_flybrix_plot_series("Ty (deg)", state.timestamp_us / 1000000, scaleTy * Ty_cmd, false);
            plotq.update_flybrix_plot_series("Tz (deg)", state.timestamp_us / 1000000, scaleTz * Tz_cmd);
        }
        plotq = $("#commands-slave-plot");
        if(plotq.find("#live").prop("checked")) {
            var scaleFz = eepromConfig.thrustSlavePIDParameters[6];
            var scaleTx = eepromConfig.pitchSlavePIDParameters[6];
            var scaleTy = eepromConfig.rollSlavePIDParameters[6];
            var scaleTz = eepromConfig.yawSlavePIDParameters[6];

            plotq.update_flybrix_plot_series("Fz (m/s)",   state.timestamp_us / 1000000, scaleFz * Fz_cmd, false);
            plotq.update_flybrix_plot_series("Tx (deg/s)", state.timestamp_us / 1000000, scaleTx * Tx_cmd, false);
            plotq.update_flybrix_plot_series("Ty (deg/s)", state.timestamp_us / 1000000, scaleTy * Ty_cmd, false);
            plotq.update_flybrix_plot_series("Tz (deg/s)", state.timestamp_us / 1000000, scaleTz * Tz_cmd);
        }  
        plotq = $("#commands-feedfoward-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("Tx Trim (pwm counts)", state.timestamp_us / 1000000, state.control_T_trim[0], false);
            plotq.update_flybrix_plot_series("Ty Trim (pwm counts)", state.timestamp_us / 1000000, state.control_T_trim[1], false);
            plotq.update_flybrix_plot_series("Tz Trim (pwm counts)", state.timestamp_us / 1000000, state.control_T_trim[2]);
        }
        plotq = $("#commands-direct-plot");
        if(plotq.find("#live").prop("checked")) {
            plotq.update_flybrix_plot_series("Fz (pwm counts)", state.timestamp_us / 1000000, Fz_cmd, false);
            plotq.update_flybrix_plot_series("Tx (pwm counts)", state.timestamp_us / 1000000, Tx_cmd + state.control_T_trim[0], false);
            plotq.update_flybrix_plot_series("Ty (pwm counts)", state.timestamp_us / 1000000, Ty_cmd + state.control_T_trim[1], false);
            plotq.update_flybrix_plot_series("Tz (pwm counts)", state.timestamp_us / 1000000, Tz_cmd + state.control_T_trim[2]);
        }

        last_signals_view_update = now;
    }
}
