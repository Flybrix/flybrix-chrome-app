function rate_from_delay(delay) {
	if (delay > 1000) {
		return 0;
	}
	if (delay == 0) {
		return 1000;
	}
	return 1000 / delay;
}

var target_rate_Hz;
var old_data_mode;

function initialize_datastream_view() {

	$('#data-rate-plot').create_plot(["update rate (Hz)", "target rate (Hz)"]);

	$('#capture-mode-filehandler').create_filehandler("start", "stop");

	$('#capture-mode-filehandler #button1').unbind().click(function (event) { // start button
        event.preventDefault();
		if (!(data_mode === "capture")) {
            command_log('Changing to capture mode.');
            
            $('#capture-mode-filehandler #file').addClass("active");

			capture_mode_callback = function (data) {
				$('#capture-mode-filehandler').write_datastream_to_filehandler(data, false);
			}
			
			old_data_mode = data_mode;
			data_mode = "capture";
		}
	});
    
    $('#capture-mode-filehandler #button2').unbind().click(function (event) { // stop button
        event.preventDefault();
		if (data_mode === "capture") {
            command_log('Closing capture mode and returning to ' + old_data_mode);
            $('#capture-mode-filehandler #file').removeClass("active");
			$('#capture-mode-filehandler').write_datastream_to_filehandler([], true);
			data_mode = old_data_mode;
		}
	});

	$('#target-delay').change(function () {
		target_rate_Hz = rate_from_delay($('#target-delay').val());
		$('#target-rate').val(target_rate_Hz.toFixed(5));
		var bytes = [$('#target-delay').val() % 256, $('#target-delay').val() / 256]; //little endian
		send_message(CommandFields.COM_SET_STATE_DELAY | CommandFields.COM_REQ_RESPONSE, new Uint8Array(bytes));

	});

	$("#current-state .model-change-mask").each(function f() {
		$(this).prop("checked", state_data_mask[parseInt($(this).attr('id'))]);
	});

	$("#current-state .model-change-mask").change(function () {
		var mask = 0;
		$("#current-state .model-change-mask:checked").each(function f() {
			mask = mask + (1 << parseInt($(this).attr('id')));
		});
		var bytes = [mask % 256, mask / 256, mask / 256 / 256, mask / 256 / 256 / 256]; //little endian
		console.log(new Uint8Array(bytes));
		send_message(CommandFields.COM_SET_STATE_MASK | CommandFields.COM_REQ_RESPONSE, new Uint8Array(bytes));
	});

	parser_callback_list.add(update_datastream_view);

	// read only model-entry-fields
	$("#current-state .model-entry-field").keydown(function (e) {
		e.preventDefault();
	});

    eeprom_refresh_callback_list.add(refresh_datastream_view_from_eepromConfig);
    refresh_datastream_view_from_eepromConfig();
};

function refresh_datastream_view_from_eepromConfig() {
    //nothing yet
};

function update_current_state() {
	$('#actual-rate').val(serial_update_rate_Hz.toFixed(5));

	var csq = $("#current-state");

	//populate fields using state data from parser
	csq.find(".timestamp_us").val((state.timestamp_us * 1.0).toFixed(0));
	csq.find(".status").val((state.status * 1.0).toFixed(0));
	csq.find(".V0_raw").val((state.V0_raw * 1.0).toFixed(3));
	csq.find(".I0_raw").val((state.I0_raw * 1.0).toFixed(3));
	csq.find(".I1_raw").val((state.I1_raw * 1.0).toFixed(3));
	loadArrayValues(csq.find(".accel"), state.accel, 3);
	loadArrayValues(csq.find(".gyro"), state.gyro, 3);
	loadArrayValues(csq.find(".mag"), state.mag, 3);
	csq.find(".temperature").val((state.temperature * 1.0).toFixed(3));
	csq.find(".pressure").val((state.pressure * 1.0).toFixed(3));
	loadArrayValues(csq.find(".ppm"), state.ppm, 0);
	csq.find(".AUX_chan_mask").val((state.AUX_chan_mask * 1.0).toFixed(0));
	loadArrayValues(csq.find(".command"), state.command, 0);
	loadArrayValues(csq.find(".control"), state.control, 3);
	loadArrayValues(csq.find(".pid_master_Fz"), state.pid_master_Fz, 2);
	loadArrayValues(csq.find(".pid_master_Tx"), state.pid_master_Tx, 2);
	loadArrayValues(csq.find(".pid_master_Ty"), state.pid_master_Ty, 2);
	loadArrayValues(csq.find(".pid_master_Tz"), state.pid_master_Tz, 2);
	loadArrayValues(csq.find(".pid_slave_Fz"), state.pid_slave_Fz, 2);
	loadArrayValues(csq.find(".pid_slave_Tx"), state.pid_slave_Tx, 2);
	loadArrayValues(csq.find(".pid_slave_Ty"), state.pid_slave_Ty, 2);
	loadArrayValues(csq.find(".pid_slave_Tz"), state.pid_slave_Tz, 2);
	loadArrayValues(csq.find(".MotorOut"), state.MotorOut, 0);
	loadArrayValues(csq.find(".kinematicsAngle"), state.kinematicsAngle, 5);
	loadArrayValues(csq.find(".kinematicsRate"), state.kinematicsRate, 5);
	csq.find(".kinematicsAltitude").val((state.kinematicsAltitude * 1.0).toFixed(3));
	csq.find(".loopCount").val((state.loopCount * 1.0).toFixed(0));
}

var last_datastream_view_update = 0;
var last_datastream_number_update = 0;
function update_datastream_view() {
	var now = Date.now();
	if ((now - last_datastream_view_update) > graph_update_delay) { //throttle redraw to 20Hz
		var drpq = $('#data-rate-plot');
		if (drpq.find("#live").prop("checked")) {
			drpq.update_flybrix_plot_series("update rate (Hz)", state.timestamp_us / 1000000, serial_update_rate_Hz, false);
			drpq.update_flybrix_plot_series("target rate (Hz)", state.timestamp_us / 1000000, target_rate_Hz);
		}
		last_datastream_view_update = now;
	}
	if ((now - last_datastream_number_update) > 150) { //throttle redraw to 6-7Hz
		update_current_state();
		last_datastream_number_update = now;
	}
}
