var MessageType = {
	State : 0,
	Command : 1,
	DebugString : 3,
	HistoryData : 4,
	Response : 255
};

var CommandFields = {
	COM_REQ_RESPONSE : 1 << 0,
	COM_SET_EEPROM_DATA : 1 << 1,
	COM_REINIT_EEPROM_DATA : 1 << 2,
	COM_REQ_EEPROM_DATA : 1 << 3,
	COM_REQ_ENABLE_ITERATION : 1 << 4,
	COM_MOTOR_OVERRIDE_SPEED_0 : 1 << 5,
	COM_MOTOR_OVERRIDE_SPEED_1 : 1 << 6,
	COM_MOTOR_OVERRIDE_SPEED_2 : 1 << 7,
	COM_MOTOR_OVERRIDE_SPEED_3 : 1 << 8,
	COM_MOTOR_OVERRIDE_SPEED_4 : 1 << 9,
	COM_MOTOR_OVERRIDE_SPEED_5 : 1 << 10,
	COM_MOTOR_OVERRIDE_SPEED_6 : 1 << 11,
	COM_MOTOR_OVERRIDE_SPEED_7 : 1 << 12,
    COM_MOTOR_OVERRIDE_SPEED_ALL : (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11) | (1 << 12) ,
	COM_SET_COMMAND_OVERRIDE : 1 << 13,
	COM_SET_STATE_MASK : 1 << 14,
	COM_SET_STATE_DELAY : 1 << 15,
	COM_REQ_HISTORY : 1 << 16,
	COM_SET_LED : 1 << 17,
};

var serial_update_rate_Hz = 0;
var char_counter = 0; //used to keep track of serial port data rate

var onSerialRead = function (readInfo) {
	if (readInfo && (readInfo.connectionId === backgroundPage.serialConnectionId) && readInfo.data) {
		var data = new Uint8Array(readInfo.data);
		char_counter += data.length;

        if (data_mode === "serial") {
            cobsReader.AppendToBuffer(data, process_binary_datastream);
        }
        else if (data_mode === "capture") {
            capture_mode_callback(data);
        }
        else if (data_mode === "replay"){
            console.log("ERROR: serial port should be closed in 'replay' mode");
        }
        else if (data_mode === "idle"){
            console.log("ERROR: serial port should be closed if we're in 'idle' mode");
        }
        else {
            console.log("ERROR: unknown data_mode");
        }
	}
};
chrome.serial.onReceive.addListener(onSerialRead);

var onSerialReadError = function (readInfo) {
	if (readInfo){
        console.log("SERIAL ERROR:", readInfo.connectionId, readInfo.error);
	}
	chrome.serial.disconnect(backgroundPage.serialConnectionId, onSerialClose);
};
chrome.serial.onReceiveError.addListener(onSerialReadError);


function serialConnectCallback(connectionInfo) {
	if (connectionInfo) {
        $('.datastream-serial #connect').text('Disconnect');
        data_mode = "serial";

        backgroundPage.serialConnectionId = connectionInfo.connectionId;
		port_selector = $('.datastream-serial select');
		var selected_port = String($(port_selector).val());

		console.log('Connection was opened with ID: ' + backgroundPage.serialConnectionId);
		command_log('Connection to: ' + selected_port + ' was opened with ID: ' + backgroundPage.serialConnectionId);

		// save selected port with chrome.storage if the port differs
		chrome.storage.local.get('last_used_port', function (result) {
			if (typeof result.last_used_port != 'undefined') {
				if (result.last_used_port != selected_port) {
					// last used port doesn't match the one found in local db, we will store the new one
					chrome.storage.local.set({
						'last_used_port' : selected_port
					}, function () {
						// Debug message is currently disabled (we dont need to spam the console log with that)
						// console.log('Last selected port was saved in chrome.storage.');
					});
				}
			} else {
				// variable isn't stored yet, saving
				chrome.storage.local.set({
					'last_used_port' : selected_port
				}, function () {
					// Debug message is currently disabled (we dont need to spam the console log with that)
					// console.log('Last selected port was saved in chrome.storage.');
				});
			}
		});

        chrome.serial.flush(backgroundPage.serialConnectionId, function(){});
		//setup callback for receiving data
		//onSerialRead is a callback in serial_backend.js

		initial_config_request = setTimeout(function () {
				// start logging port usage
                port_usage(); // calls recursively using setTimeout to act as a watchdog

				// request configuration data (so we have something to work with)
				requestCONFIG();

				// set the state message mask and frequency
				setTimeout(function () {

                    var default_delay_msec = 50;

					send_message(CommandFields.COM_SET_STATE_MASK | CommandFields.COM_SET_STATE_DELAY | CommandFields.COM_REQ_RESPONSE,
						new Uint8Array([255, 255, 255, 255, default_delay_msec % 256, default_delay_msec / 256]));
                    //update fields in datastream tab
                    setTargetDelay(default_delay_msec);
                    $('#datastream #current-state .model-change-mask').prop('checked', true);
				}, 100);

			}, 500);

	} else {
		$('div.datastream-serial a.connect').click(); // reset the connect button back to "disconnected" state
		console.log('There was a problem while opening the connection.');
		command_log('Could not join the serial bus -- <span style="color: red;">ERROR</span>');
	}
}

function onSerialClose(result) {
	if (result) { // All went as expected
		console.log('Connection closed successfully.');
		command_log('Connection closed -- <span style="color: green;">OK</span>');

		backgroundPage.serialConnectionId = -1; // reset connection id

		$('#content').empty(); // empty content
		$('#tabs > ul li').removeClass('active'); // de-select any selected tabs

	} else { // Something went wrong
		if (backgroundPage.serialConnectionId > 0) {
			console.log('There was an error that happened during "connection-close" procedure.');
			command_log('Connection closed -- <span style="color: red;">ERROR</span>');
		}
	}
};

var last_port_usage_update = 0;
var graph_update_delay = 50;
function port_usage() {
    var now = Date.now();

		graph_update_delay *= 0.8;
		if (graph_update_delay < 50) {
			graph_update_delay = 50;
		}

    if (last_port_usage_update>0){
        var ui_update_rate = now - last_port_usage_update; //should be 1000 msec, as per setTimeout above

        //throttle back datastream when the UI lags behind to keep things usable
        if (ui_update_rate > 1020) {
            command_log('UI is falling behind -- <span style="color: red;">SLOWING DOWN GRAPH UPDATES</span>');
            graph_update_delay *= 2.0;
        }
        var port_speed_kbps = char_counter / ui_update_rate;
        $('#port-usage').html( port_speed_kbps.toFixed(3) + ' kbps');
    };
    char_counter = 0;
    last_port_usage_update = now;
    setTimeout(port_usage, 1000);
}

var capture_mode_callback = function(data){console.log("ERROR: capture mode callback not set!")};


function byteNinNum(data, n) {
	return (data >> (8 * n)) & 0xFF;
}

var cobsTEMPORARY;

function send_message(mask, data, log_send) {
    log_send = typeof log_send !== 'undefined' ? log_send : true;

		if (backgroundPage.serialConnectionId < 0)  // if there is no serial connection
				return;

	var checksum = 0;
	var bufferOut,
	bufView;
	// always reserve 1 byte for protocol overhead !
	if (typeof data === 'object') {
		var size = 7 + data.length;
		bufView = new Uint8Array(size);
		checksum ^= bufView[1] = MessageType.Command;
		for (var i = 0; i < 4; ++i)
			checksum ^= bufView[i + 2] = byteNinNum(mask, i);
		for (var i = 0; i < data.length; i++)
			checksum ^= bufView[i + 6] = data[i];
	} else {
		bufferOut = new ArrayBuffer(8);
		bufView = new Uint8Array(bufferOut);
		checksum ^= bufView[1] = MessageType.Command;
		for (var i = 0; i < 4; ++i)
			checksum ^= bufView[i + 2] = byteNinNum(mask, i);
		checksum ^= bufView[6] = data; // payload
	}
	bufView[0] = checksum; // crc
	bufView[bufView.length - 1] = 0;

	setTimeout(function(){chrome.serial.send(backgroundPage.serialConnectionId, cobsTEMPORARY.encode(bufView), function (writeInfo) {});},1);

    if (log_send){
        command_log('Sending command <span style="color:blue">'+ MessageType.Command +'</blue>');
    }
}

(function() {
		'use strict';

		angular.module('flybrixApp').factory('serial', function () {
				return {
					send: send_message,
				};
		});
}());
