var CommandFields;  // TODO: wrap this into the IIFE as well

(function() {
    'use strict';

    var parser = function(commandLog) {
        var MessageType = {
            State: 0,
            Command: 1,
            DebugString: 3,
            HistoryData: 4,
            Response: 255,
        };

        var CommandField = {
            COM_REQ_RESPONSE: 1 << 0,
            COM_SET_EEPROM_DATA: 1 << 1,
            COM_REINIT_EEPROM_DATA: 1 << 2,
            COM_REQ_EEPROM_DATA: 1 << 3,
            COM_REQ_ENABLE_ITERATION: 1 << 4,
            COM_MOTOR_OVERRIDE_SPEED_0: 1 << 5,
            COM_MOTOR_OVERRIDE_SPEED_1: 1 << 6,
            COM_MOTOR_OVERRIDE_SPEED_2: 1 << 7,
            COM_MOTOR_OVERRIDE_SPEED_3: 1 << 8,
            COM_MOTOR_OVERRIDE_SPEED_4: 1 << 9,
            COM_MOTOR_OVERRIDE_SPEED_5: 1 << 10,
            COM_MOTOR_OVERRIDE_SPEED_6: 1 << 11,
            COM_MOTOR_OVERRIDE_SPEED_7: 1 << 12,
            COM_MOTOR_OVERRIDE_SPEED_ALL: (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11) | (1 << 12),
            COM_SET_COMMAND_OVERRIDE: 1 << 13,
            COM_SET_STATE_MASK: 1 << 14,
            COM_SET_STATE_DELAY: 1 << 15,
            COM_REQ_HISTORY: 1 << 16,
            COM_SET_LED: 1 << 17,
        };

        var state_base = {
            timestamp_us: 0,
            status: 0,
            V0_raw: 0,
            I0_raw: 0,
            I1_raw: 0,
            accel: [0, 0, 0],
            gyro: [0, 0, 0],
            mag: [0, 0, 0],
            temperature: 0,
            pressure: 0,
            ppm: [0, 0, 0, 0, 0, 0],
            AUX_chan_mask: 0,
            command: [0, 0, 0, 0],              // throttle, pitch, roll, yaw
            control: [0, 0, 0, 0],              // Fz, Tx, Ty, Tz
            pid_master_Fz: [0, 0, 0, 0, 0, 0],  // Fz: time, input, setpoint, p_term, i_term, d_term
            pid_master_Tx: [0, 0, 0, 0, 0, 0],  // Tx: time, input, setpoint, p_term, i_term, d_term
            pid_master_Ty: [0, 0, 0, 0, 0, 0],  // Ty: time, input, setpoint, p_term, i_term, d_term
            pid_master_Tz: [0, 0, 0, 0, 0, 0],  // Tz: time, input, setpoint, p_term, i_term, d_term
            pid_slave_Fz: [0, 0, 0, 0, 0, 0],   // Fz: time, input, setpoint, p_term, i_term, d_term
            pid_slave_Tx: [0, 0, 0, 0, 0, 0],   // Tx: time, input, setpoint, p_term, i_term, d_term
            pid_slave_Ty: [0, 0, 0, 0, 0, 0],   // Ty: time, input, setpoint, p_term, i_term, d_term
            pid_slave_Tz: [0, 0, 0, 0, 0, 0],   // Tz: time, input, setpoint, p_term, i_term, d_term
            MotorOut: [0, 0, 0, 0, 0, 0, 0, 0],
            kinematicsAngle: [0, 0, 0],
            kinematicsRate: [0, 0, 0],
            kinematicsAltitude: 0,
            loopCount: 0,
        };

        var StateFields = {
            STATE_ALL: 0xFFFFFFFF,
            STATE_NONE: 0,
            STATE_MICROS: 1 << 0,
            STATE_STATUS: 1 << 1,
            STATE_V0: 1 << 2,
            STATE_I0: 1 << 3,
            STATE_I1: 1 << 4,
            STATE_ACCEL: 1 << 5,
            STATE_GYRO: 1 << 6,
            STATE_MAG: 1 << 7,
            STATE_TEMPERATURE: 1 << 8,
            STATE_PRESSURE: 1 << 9,
            STATE_RX_PPM: 1 << 10,
            STATE_AUX_CHAN_MASK: 1 << 11,
            STATE_COMMANDS: 1 << 12,
            STATE_F_AND_T: 1 << 13,
            STATE_PID_FZ_MASTER: 1 << 15,
            STATE_PID_TX_MASTER: 1 << 16,
            STATE_PID_TY_MASTER: 1 << 17,
            STATE_PID_TZ_MASTER: 1 << 18,
            STATE_PID_FZ_SLAVE: 1 << 19,
            STATE_PID_TX_SLAVE: 1 << 20,
            STATE_PID_TY_SLAVE: 1 << 21,
            STATE_PID_TZ_SLAVE: 1 << 22,
            STATE_MOTOR_OUT: 1 << 23,
            STATE_KINE_ANGLE: 1 << 24,
            STATE_KINE_RATE: 1 << 25,
            STATE_KINE_ALTITUDE: 1 << 26,
            STATE_LOOP_COUNT: 1 << 27,
        };

        var callbackCommand = function(mask, message_buffer) {
            if (mask == CommandFields.COM_SET_EEPROM_DATA) {
                console.log("RECEIVED CONFIG!");
                var data = new DataView(message_buffer, 0);
                data.parseCONFIG(eepromConfig);

                if ((flybrix_app_configuration_version[0] != eepromConfig.version[0]) || (flybrix_app_configuration_version[1] != eepromConfig.version[1])) {
                    commandLog('<span style="color: red">WARNING: Configuration MAJOR or MINOR version mismatch!</span>');
                    commandLog(
                        'eeprom version: <strong>' + eepromConfig.version[0] + '.' + eepromConfig.version[1] + '.' + eepromConfig.version[2] + '</strong>' +
                        ' - app expected version: <strong>' + flybrix_app_configuration_version.version[0] + '.' + flybrix_app_configuration_version.version[1] + '.' +
                        flybrix_app_configuration_version.version[2] + '</strong>');
                } else {
                    commandLog('Recieved configuration version:  <span style="color: green">' + eepromConfig.version[0] + '.' + eepromConfig.version[1] + '.' + eepromConfig.version[2] + '</span>');
                }
            }
        };

        function arraybuffer2string(buf) {
            return String.fromCharCode.apply(null, new Uint8Array(buf));
        }

        function parse_pid_data(data, destination, byteRef) {
            destination[0] = data.getUint32(byteRef.index, 1);  // time
            byteRef.add(4);
            for (var i = 1; i < 6; i++) {
                destination[i] = data.getFloat32(byteRef.index, 1);
                byteRef.add(4);
            }
        }

        var last_timestamp_us = 0;

        function callbackStateHelper(mask, message_buffer, cb_state) {
            var state = $.extend(true, {}, state_base);
            var state_data_mask = [];
            var data = new DataView(message_buffer, 0);
            var b = new byteRef();
            var serial_update_rate_Hz = 0;

            for (var i = 0; i < state_data_mask.length; i++)
                state_data_mask.push(0);

            if (0 != (mask & StateFields.STATE_MICROS)) {
                state_data_mask[0] = 1;
                state.timestamp_us = data.getUint32(b.index, 1);
                b.add(4);

                serial_update_rate_Hz = 1000000 / (state.timestamp_us - last_timestamp_us);
                last_timestamp_us = state.timestamp_us;
            }
            if (0 != (mask & StateFields.STATE_STATUS)) {
                state_data_mask[1] = 1;
                state.status = data.getUint16(b.index, 1);
                b.add(2);
            }
            if (0 != (mask & StateFields.STATE_V0)) {
                state_data_mask[2] = 1;
                state.V0_raw = data.getUint16(b.index, 1);
                b.add(2);
            }
            if (0 != (mask & StateFields.STATE_I0)) {
                state_data_mask[3] = 1;
                state.I0_raw = data.getUint16(b.index, 1);
                b.add(2);
            }
            if (0 != (mask & StateFields.STATE_I1)) {
                state_data_mask[4] = 1;
                state.I1_raw = data.getUint16(b.index, 1);
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
                state.temperature = data.getUint16(b.index, 1) / 100.0;  // temperature
                b.add(2);
            }
            if (0 != (mask & StateFields.STATE_PRESSURE)) {
                state_data_mask[9] = 1;
                state.pressure = data.getUint32(b.index, 1) / 256.0;  // pressure (Q24.8)
                b.add(4);
            }
            if (0 != (mask & StateFields.STATE_RX_PPM)) {
                state_data_mask[10] = 1;
                parseInt16Array(data, state.ppm, b);
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
                state.kinematicsAltitude = data.getFloat32(b.index, 1);
                b.add(4);
            }
            if (0 != (mask & StateFields.STATE_LOOP_COUNT)) {
                state_data_mask[27] = 1;
                state.loopCount = data.getUint32(b.index, 1);
                b.add(4);
            }
            cb_state(state, state_data_mask, serial_update_rate_Hz);
        }

        function dispatch(command, mask, message_buffer, cb_state, cb_command, cb_ack) {
            switch (command) {
                case MessageType.State:
                    cb_state(mask, message_buffer);
                    break;
                case MessageType.Command:
                    cb_command(mask, message_buffer);
                    break;
                case MessageType.DebugString:
                    var debug_string = arraybuffer2string(message_buffer);
                    console.log("Debug message: ", debug_string);
                    commandLog('Received <span style="color: orange">DEBUG</span>: ' + debug_string);
                    break;
                case MessageType.HistoryData:
                    var debug_string = arraybuffer2string(message_buffer);
                    commandLog('Received <span style="color: orange">HISTORY DATA</span>');
                    break;
                case MessageType.Response:
                    var data = new DataView(message_buffer, 0);
                    cb_ack(mask, data.getUint32(0, 1));
                    break;
                default:
                    break;
            }
        }

        var processBinaryDatastream = function(command, mask, message_buffer, cb_state, cb_ack) {
            dispatch(command, mask, message_buffer, function() {
                callbackStateHelper(mask, message_buffer, cb_state)
            }, callbackCommand, cb_ack);
        };

        CommandFields = CommandField;

        return {
            processBinaryDatastream: processBinaryDatastream,
            MessageType: MessageType,
            CommandFields: CommandField,
        };
    };

    angular.module('flybrixApp').factory('parser', ['commandLog', parser]);
}());
