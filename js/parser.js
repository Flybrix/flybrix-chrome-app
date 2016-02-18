var state_data_mask =
	[0, // timestamp_us : 0,
	0, // status: 0,
	0, // V0_raw: 0,
	0, // I0_raw: 0,
	0, // I1_raw: 0,
	0, // accel : [0, 0, 0],
	0, // gyro: [0, 0, 0],
	0, // mag: [0, 0, 0],
	0, // temperature: 0,
	0, // pressure: 0,
	0, // ppm: [0,0,0,0,0,0] and ppm_midpoint: [0,0,0]
	0, // AUX_chan_mask: 0, //{AUX1_low, AUX1_mid, AUX1_high, AUX2_low, AUX2_mid, AUX2_high, x, x} (LSB-->MSB)
	0, // command: [0,0,0,0], //throttle, pitch, roll, yaw
	0, // control: [0,0,0,0], //Fz, Tx, Ty, Tz
	0, // control_T_trim: [0,0,0], // Tx_trim, Ty_trim, Tz_trim
	0, // pid_master_Fz: [0,0,0,0,0,0], //Fz: time, input, setpoint, p_term, i_term, d_term
	0, // pid_master_Tx: [0,0,0,0,0,0], //Tx: time, input, setpoint, p_term, i_term, d_term
	0, // pid_master_Ty: [0,0,0,0,0,0], //Ty: time, input, setpoint, p_term, i_term, d_term
	0, // pid_master_Tz: [0,0,0,0,0,0], //Tz: time, input, setpoint, p_term, i_term, d_term
	0, // pid_slave_Fz: [0,0,0,0,0,0], //Fz: time, input, setpoint, p_term, i_term, d_term
	0, // pid_slave_Tx: [0,0,0,0,0,0], //Tx: time, input, setpoint, p_term, i_term, d_term
	0, // pid_slave_Ty: [0,0,0,0,0,0], //Ty: time, input, setpoint, p_term, i_term, d_term
	0, // pid_slave_Tz: [0,0,0,0,0,0], //Tz: time, input, setpoint, p_term, i_term, d_term
	0, // MotorOut: [0,0,0,0,0,0,0,0],
	0, // kinematicsAngle: [0, 0, 0],
	0, // kinematicsRate: [0, 0, 0],
	0, // kinematicsAltitude: 0,
	0, // loopCount: 0,
];

var state = {
	timestamp_us : 0,
	status : 0,
	V0_raw : 0,
	I0_raw : 0,
	I1_raw : 0,
	accel : [0, 0, 0],
	gyro : [0, 0, 0],
	mag : [0, 0, 0],
	temperature : 0,
	pressure : 0,
	ppm : [0, 0, 0, 0, 0, 0],
	ppm_midpoint : [0, 0, 0],
	AUX_chan_mask : 0,
	command : [0, 0, 0, 0], //throttle, pitch, roll, yaw
	control : [0, 0, 0, 0], //Fz, Tx, Ty, Tz
	control_T_trim : [0, 0, 0], // Tx_trim, Ty_trim, Tz_trim
	pid_master_Fz : [0, 0, 0, 0, 0, 0], //Fz: time, input, setpoint, p_term, i_term, d_term
	pid_master_Tx : [0, 0, 0, 0, 0, 0], //Tx: time, input, setpoint, p_term, i_term, d_term
	pid_master_Ty : [0, 0, 0, 0, 0, 0], //Ty: time, input, setpoint, p_term, i_term, d_term
	pid_master_Tz : [0, 0, 0, 0, 0, 0], //Tz: time, input, setpoint, p_term, i_term, d_term
	pid_slave_Fz : [0, 0, 0, 0, 0, 0], //Fz: time, input, setpoint, p_term, i_term, d_term
	pid_slave_Tx : [0, 0, 0, 0, 0, 0], //Tx: time, input, setpoint, p_term, i_term, d_term
	pid_slave_Ty : [0, 0, 0, 0, 0, 0], //Ty: time, input, setpoint, p_term, i_term, d_term
	pid_slave_Tz : [0, 0, 0, 0, 0, 0], //Tz: time, input, setpoint, p_term, i_term, d_term
	MotorOut : [0, 0, 0, 0, 0, 0, 0, 0],
	kinematicsAngle : [0, 0, 0],
	kinematicsRate : [0, 0, 0],
	kinematicsAltitude : 0,
	loopCount : 0
};

var StateFields = {
	STATE_ALL : 0xFFFFFFFF,
	STATE_NONE : 0,
	STATE_MICROS : 1 << 0,
	STATE_STATUS : 1 << 1,
	STATE_V0 : 1 << 2,
	STATE_I0 : 1 << 3,
	STATE_I1 : 1 << 4,
	STATE_ACCEL : 1 << 5,
	STATE_GYRO : 1 << 6,
	STATE_MAG : 1 << 7,
	STATE_TEMPERATURE : 1 << 8,
	STATE_PRESSURE : 1 << 9,
	STATE_RX_PPM : 1 << 10,
	STATE_AUX_CHAN_MASK : 1 << 11,
	STATE_COMMANDS : 1 << 12,
	STATE_F_AND_T : 1 << 13,
	STATE_T_TRIM : 1 << 14,
	STATE_PID_FZ_MASTER : 1 << 15,
	STATE_PID_TX_MASTER : 1 << 16,
	STATE_PID_TY_MASTER : 1 << 17,
	STATE_PID_TZ_MASTER : 1 << 18,
	STATE_PID_FZ_SLAVE : 1 << 19,
	STATE_PID_TX_SLAVE : 1 << 20,
	STATE_PID_TY_SLAVE : 1 << 21,
	STATE_PID_TZ_SLAVE : 1 << 22,
	STATE_MOTOR_OUT : 1 << 23,
	STATE_KINE_ANGLE : 1 << 24,
	STATE_KINE_RATE : 1 << 25,
	STATE_KINE_ALTITUDE : 1 << 26,
	STATE_LOOP_COUNT : 1 << 27,
};

var parser_callback_list = $.Callbacks('unique');

function parse_pid_data(data, destination, byteRef) {
	destination[0] = data.getUint32(byteRef.index, 1); //time
	byteRef.add(4);
	for (var i = 1; i < 6; i++) {
		destination[i] = data.getFloat32(byteRef.index, 1);
		byteRef.add(4);
	}
}

function arraybuffer2string(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function process_binary_datastream(command, mask, message_buffer) {
	switch (command) {
	case MessageType.State:
		parse_data_packet(mask, message_buffer);
		break;
	case MessageType.Command:
		if (mask == CommandFields.COM_SET_EEPROM_DATA) {

			console.log("RECEIVED CONFIG!");
			var data = new DataView(message_buffer, 0);
			data.parseCONFIG(eepromConfig);

			if ((latest_stable_version[0] != eepromConfig.version[0]) ||
				(latest_stable_version[1] != eepromConfig.version[1]) ||
				(latest_stable_version[2] != eepromConfig.version[2])) {
				command_log('<span style="color: red">WARNING: EEPROM Configuration Version Mismatch!</span>');
				command_log('Configurator version: <strong>' + version + '</strong> - Flight software version: <strong>' + eepromConfig.version + '</strong>');

			} else {
				command_log('Configuration CONFIG received -- <span style="color: green">OK</span>');
			}
		}
		break;
	case MessageType.DebugString:
				var debug_string = arraybuffer2string(message_buffer);
				console.log("Debug message: ", debug_string);
        command_log('Received <span style="color: orange">DEBUG</span>: ' + debug_string);
		break;
	case MessageType.HistoryData:
				var debug_string = arraybuffer2string(message_buffer);
        command_log('Received <span style="color: orange">HISTORY DATA</span>');
		break;
	case MessageType.Response:
		var data = new DataView(message_buffer, 0);
		console.log("Response mask:", mask, "with ack of", data.getUint32(0, 1));
		command_log('Received <span style="color: green">ACK</span>: ' + data.getUint32(0, 1));
		break;
	default:
		break;
	}
}

function parse_data_packet(mask, message_buffer) {

	var data = new DataView(message_buffer, 0);
	var b = new byteRef();

	for (var i = 0; i < state_data_mask.length; i++) {
		state_data_mask[i] = 0;
	}

	if (0 != (mask & StateFields.STATE_MICROS)) {
		var last_timestamp_us = state.timestamp_us;

		state_data_mask[0] = 1;
		state.timestamp_us = data.getUint32(b.index, 1);
		b.add(4);

		serial_update_rate_Hz = 1000000 / (state.timestamp_us - last_timestamp_us);
	}
	if (0 != (mask & StateFields.STATE_STATUS)) {
		state_data_mask[1] = 1;
		state.status = data.getUint16(b.index, 1);
		b.add(2);
	}
	if (0 != (mask & StateFields.STATE_V0)) {
		state_data_mask[2] = 1;
		state.V0_raw = 10 * (20.5 + 226) / 20.5 * 1.2 / 65536 * data.getUint16(b.index, 1);
		b.add(2);
	}
	if (0 != (mask & StateFields.STATE_I0)) {
		state_data_mask[3] = 1;
		state.I0_raw = 1000 * (1 / 50) / 0.003 * 1.2 / 65536 * data.getUint16(b.index, 1);
		b.add(2);
	}
	if (0 != (mask & StateFields.STATE_I1)) {
		state_data_mask[4] = 1;
		state.I1_raw = 1000 * (1 / 50) / 0.03 * 1.2 / 65536 * data.getUint16(b.index, 1);
		b.add(2);
	}
	if (0 != (mask & StateFields.STATE_ACCEL)) {
		state_data_mask[5] = 1;
		parseFloat32Array(data, state.accel, b);
	}
	if (0 != (mask & StateFields.STATE_GYRO)) {
		state_data_mask[6] = 1;
		parseFloat32Array(data, state.gyro, b);
	}
	if (0 != (mask & StateFields.STATE_MAG)) {
		state_data_mask[7] = 1;
		parseFloat32Array(data, state.mag, b);
	}
	if (0 != (mask & StateFields.STATE_TEMPERATURE)) {
		state_data_mask[8] = 1;
		state.temperature = data.getUint16(b.index, 1) / 100.0; // temperature
		b.add(2);
	}
	if (0 != (mask & StateFields.STATE_PRESSURE)) {
		state_data_mask[9] = 1;
		state.pressure = data.getUint32(b.index, 1) / 256.0; // pressure (Q24.8)
		b.add(4);
	}
	if (0 != (mask & StateFields.STATE_RX_PPM)) {
		state_data_mask[10] = 1;
		parseInt16Array(data, state.ppm, b);
		parseInt16Array(data, state.ppm_midpoint, b);
	}
	if (0 != (mask & StateFields.STATE_AUX_CHAN_MASK)) {
		state_data_mask[11] = 1;
		state.AUX_chan_mask = data.getUint8(b.index, 1);
		b.add(1);
	}
	if (0 != (mask & StateFields.STATE_COMMANDS)) {
		state_data_mask[12] = 1;
		parseInt16Array(data, state.command, b);
	}
	if (0 != (mask & StateFields.STATE_F_AND_T)) {
		state_data_mask[13] = 1;
		parseFloat32Array(data, state.control, b);
	}
	if (0 != (mask & StateFields.STATE_T_TRIM)) {
		state_data_mask[14] = 1;
		parseFloat32Array(data, state.control_T_trim, b);
	}
	if (0 != (mask & StateFields.STATE_PID_FZ_MASTER)) {
		state_data_mask[15] = 1;
		parse_pid_data(data, state.pid_master_Fz, b);
	}
	if (0 != (mask & StateFields.STATE_PID_TX_MASTER)) {
		state_data_mask[16] = 1;
		parse_pid_data(data, state.pid_master_Tx, b);
	}
	if (0 != (mask & StateFields.STATE_PID_TY_MASTER)) {
		state_data_mask[17] = 1;
		parse_pid_data(data, state.pid_master_Ty, b);
	}
	if (0 != (mask & StateFields.STATE_PID_TZ_MASTER)) {
		state_data_mask[18] = 1;
		parse_pid_data(data, state.pid_master_Tz, b);
	}
	if (0 != (mask & StateFields.STATE_PID_FZ_SLAVE)) {
		state_data_mask[19] = 1;
		parse_pid_data(data, state.pid_slave_Fz, b);
	}
	if (0 != (mask & StateFields.STATE_PID_TX_SLAVE)) {
		state_data_mask[20] = 1;
		parse_pid_data(data, state.pid_slave_Tx, b);
	}
	if (0 != (mask & StateFields.STATE_PID_TY_SLAVE)) {
		state_data_mask[21] = 1;
		parse_pid_data(data, state.pid_slave_Ty, b);
	}
	if (0 != (mask & StateFields.STATE_PID_TZ_SLAVE)) {
		state_data_mask[22] = 1;
		parse_pid_data(data, state.pid_slave_Tz, b);
	}
	if (0 != (mask & StateFields.STATE_MOTOR_OUT)) {
		state_data_mask[23] = 1;
		parseInt16Array(data, state.MotorOut, b);
	}
	if (0 != (mask & StateFields.STATE_KINE_ANGLE)) {
		state_data_mask[24] = 1;
		parseFloat32Array(data, state.kinematicsAngle, b);
	}
	if (0 != (mask & StateFields.STATE_KINE_RATE)) {
		state_data_mask[25] = 1;
		parseFloat32Array(data, state.kinematicsRate, b);
	}
	if (0 != (mask & StateFields.STATE_KINE_ALTITUDE)) {
		state_data_mask[26] = 1;
		state.kinematicsAltitude[3] = data.getFloat32(b.index, 1);
		b.add(4);
	}
	if (0 != (mask & StateFields.STATE_LOOP_COUNT)) {
		state_data_mask[27] = 1;
		state.loopCount = data.getUint32(b.index, 1);
		b.add(4);
	}
	parser_callback_list.fire();
}
