/*
 *  Flybrix Configurator -- Copyright 2015 Flying Selfie Inc.
 *
 *  License and other details available at: http://www.flybrix.com/configurator
 *

Credit is due to several other projects, including:
- multiwii ("https://github.com/multiwii")
- phoenix flight controller ("https://github.com/cTn-dev/Phoenix-FlightController")

 */

var data_mode = "idle"; // valid modes: 'serial','replay','capture', and 'idle'

var replay_buffer;
var replay_point;

var cobsReader = new cobs.Reader(2000);

// Get access to the background window object
// This object is used to pass current serial port connectionId to the backround page
// so the onClosed event can close the port for us if it was left opened, without this
// users can experience weird behavior if they would like to access the serial bus afterwards.
var backgroundPage;
chrome.runtime.getBackgroundPage(function (result) {
	backgroundPage = result;
	backgroundPage.serialConnectionId = -1;
});

// keep track of tabs (fix this with something less hacky someday)
var tab_id_initialized = [false, false, false, false, false, false, false];
var tab_dialog_open = [false, false, false, false, false, false, false];
var tab_view_init_functions = [initialize_tuning_view, initialize_sensors_view, initialize_signals_view,
	initialize_vehicle_view, initialize_motors_view, initialize_led_view, initialize_datastream_view,
	initialize_config_view];
var tab_view_eeprom_refresh_functions = [refresh_tuning_view_from_eepromConfig, refresh_sensors_view_from_eepromConfig, refresh_signals_view_from_eepromConfig,
	refresh_vehicle_view_from_eepromConfig, refresh_motors_view_from_eepromConfig, refresh_led_view_from_eepromConfig, refresh_datastream_view_from_eepromConfig,
	refresh_config_view_from_eepromConfig];
var tab_hrefs = ['#tuning', '#sensors', '#signals', '#vehicle', '#motors', '#led', '#datastream', '#config'];
var port_selector;
var port_selector_refresh_callback;
var discovered_ports = false;
var connected_port = false;
var auto_connect = false;

function diff(A, B) {
	var out = [];

	// create hardcopy
	for (var i = 0; i < A.length; i++) {
		out.push(A[i]);
	}

	for (var i = 0; i < B.length; i++) {
		if (out.indexOf(B[i]) != -1) {
			out.splice(out.indexOf(B[i]), 1);
		}
	}
	return out;

}

function refresh_port_selector() {
	chrome.serial.getDevices(function (ports) {
		var devices = [];
		ports.forEach(function (device) {
			devices.push(device.path);
		});

		if (!discovered_ports || diff(discovered_ports, devices).length > 0) {
			var diff_ports = diff(discovered_ports, devices);

			if (discovered_ports != false) {
				console.log("discovered_ports not false");
				if (diff_ports.length > 1) {
					console.log('Port unplugged: ' + diff_ports);
				} else {
					console.log('Port unplugged: ' + diff_ports[0]);
				}
			}
			/*
			if disconnected ports contains active then disconnect
			 */
			if (connected_port) {
				for (var i = 0; i < diff_ports.length; i++) {
					if (diff_ports[i] == connected_port) {
						console.log("disconnected connected port");
						connect_disconnect();
					}
				}
			}

			port_selector.html('');
			if (devices.length > 0) {
				// Port list received

				devices.forEach(function (device) {
					$(port_selector).append($("<option/>", {
							value : device,
							text : device
						}));
				});
				if (!discovered_ports) {
					chrome.storage.local.get('last_used_port', function (result) {
						// if last_used_port was set, we try to select it
						if (typeof result.last_used_port != 'undefined') {
							// check if same port exists, if it does, select it
							ports.forEach(function (port) {
								if (port.path == result.last_used_port) {
									$(port_selector).val(result.last_used_port);
								}
							});
						}
					});
				}
			} else {
				$(port_selector).append($("<option/>", {
						value : 0,
						text : 'NOT FOUND'
					}));

				console.log("No serial ports detected");

			}
			if (!discovered_ports) {
				discovered_ports = devices;
			} else {
				for (var i = 0; i < diff_ports.length; i++) {
					discovered_ports.splice(discovered_ports.indexOf(diff_ports[i]), 1);
				}
			}

		}

		var new_ports = diff(devices, discovered_ports);
		if (new_ports.length) {

			if (new_ports.length > 1) {
				console.log('Port found: ' + new_ports);
			} else {
				console.log('Port found: ' + new_ports[0]);
			}
			port_selector.html('');
			devices.forEach(function (device) {
				$(port_selector).append($("<option/>", {
						value : device,
						text : device
					}));
			});
			// if already connected switch to connected port
			if (connected_port) {
				port_selector.val(connected_port);
			} else {
				port_selector.val(new_ports[0])
				if (auto_connect) {
					connect_disconnect();
				}
			}

			discovered_ports = devices;

		}

	});
	port_selector_refresh_callback = setTimeout(refresh_port_selector, 200);
}

function connect_disconnect() {
	console.log('connect/disconnect');
	var connect_button = $('.datastream-serial #connect');
	var connected = connect_button.data('connected'); //initially zero (false)

	selected_port = String($(port_selector).val());

	if (selected_port != '0') {
		if (connected) {

			console.log('Disconnecting from: ' + selected_port);
			if (backgroundPage.serialConnectionId > 0) {
				chrome.serial.disconnect(backgroundPage.serialConnectionId, onSerialClose);
			}

			// if we disconnect before we ask for initial config data
			if (initial_config_request) {
				clearTimeout(initial_config_request);
			}

			// Reset port usage indicator to 0
			$('span.port-usage').html(0 + ' kbps');

			connect_button.text('Connect');
			connected_port = false;
			data_mode = "idle";

		} else {
			console.log('Connecting to: ' + selected_port);

			chrome.serial.connect(selected_port, {
				bufferSize : 4096 * 5, //???
				bitrate : 250000 //doesn't matter for USB
			}, serialConnectCallback);
			connected_port = selected_port;
		}

		connect_button.data("connected", !connected);
	}
}

$(document).ready(function () {

	chrome.app.window.current().outerBounds.maxHeight = 0;
	chrome.app.window.current().outerBounds.maxWidth = 0;

	chrome.storage.local.get('auto_connect', function (result) {
		if (result.auto_connect === 'undefined' || result.auto_connect) {
			auto_connect = true;
			$('input.auto_connect').prop('checked', true);

		} else {
			// disabled by user
			auto_connect = false;
			$('input.auto_connect').prop('checked', false);
		}
		// bind UI hook to auto-connect checkbos
		$('input.auto_connect').change(function () {
			auto_connect = $(this).is(':checked');
			chrome.storage.local.set({
				'auto_connect' : auto_connect
			});
			if (auto_connect) {
				if (!connected_port) {
					connect_disconnect();
				}
			}
		});

	});

	// serial datastream setup
	port_selector = $('.datastream-serial select');
	//$('.datastream-serial #refresh').click(refresh_port_selector);
	// software click to refresh port picker select (during initial load)
	//$('.datastream-serial #refresh').click();

	refresh_port_selector();

	function setReplayPosition(position) {
		replay_point = position;
		$('.datastream-replay .slider').slider("value", position);
		$('.datastream-replay .datastream-report').html(position);
	}

	$('.datastream-serial #connect').click(connect_disconnect);
	// replay datastream setup
	$('.datastream-replay .slider').slider({
		value : 0,
		min : 0,
		max : 100,
		disabled : true,
		start : function (event, ui) {
			// pause playback while we're moving the marker
			//$('.datastream-replay .datastream-report').html(ui.value);

			if (data_mode === "replay") {
				fireOffStop();
			}
		},
		stop : function (event, ui) {
			setReplayPosition(ui.value);
		},
	});
	//  https://api.jqueryui.com/slider/

	function checkVersion(ver) {
		if (ver === flybrix_app_configuration_version)
			return true;
		if (ver == null || flybrix_app_configuration_version == null)
			return false;
		if (ver.length !== flybrix_app_configuration_version.length)
			return false;
		for (var i = 0; i < ver.length; ++i)
			if (ver[i] !== flybrix_app_configuration_version[i])
				return false;
		return true;
	}

	$('.datastream-replay #open').click(function () {
		event.preventDefault();
		var accepts = [{
				mimeTypes : ['text/*'],
				extensions : ['dat', 'csv', 'txt', 'bin', 'log', 'raw']
			}
		];
		var file_textbox_selector = $('.datastream-replay .filename')
			chrome.fileSystem.chooseEntry({
				type : 'openFile',
				accepts : accepts
			}, function (chosenEntry) {
				if (!chosenEntry) {
					$('.datastream-replay .filename').html('No File Selected!');
					return;
				}
				// read all contents into replay buffer //TODO worry about size...
				chosenEntry.file(function (file) {
					var reader = new FileReader();
					reader.onerror = function (e) {
						console.error(e);
					};
					reader.onloadend = function (e) {
						try {
							var dataObject = JSON.parse(reader.result);
							if (!('version' in dataObject))
								throw "File is missing the 'version' field";
							if (!('config' in dataObject))
								throw "File is missing the 'config' field";
							if (!('data' in dataObject))
								throw "File is missing the 'data' field";
							if (!checkVersion(dataObject.version))
								throw "The requested recording is made on an old firmware version";
							replay_buffer = new Uint8Array(atob(dataObject.data).split("").map(function (c) {
										return c.charCodeAt(0);
									}));
							replay_point = 0;
						} catch (err) {
							command_log('Read <span style="color: red;">FAILED</span>: ' + err);
							console.log('Read FAILED, error:', err);
							return;
						}

						command_log('Read <span style="color: green;">SUCCESSFUL</span>');
						console.log('Read SUCCESSFUL');

						$('.datastream-replay .datastream-report').html("Loaded " + replay_buffer.length + " bytes.");
						$('.datastream-replay .slider').slider("option", "disabled", false);
						$('.datastream-replay .slider').slider("option", "max", replay_buffer.length);
					};
					reader.readAsText(file);
				});

				chrome.fileSystem.getDisplayPath(chosenEntry, function (displayPath) {
					$('.datastream-replay .filename').html(displayPath);
				});
			});
	});

	var data_rate_field = $("#data-rate");

	function simulateData(inputData, tickDelay) {
		if (data_mode != "replay")
			return;
		if (inputData.length < 1) {
			fireOffStop();
			setReplayPosition(0);
			return;
		}
		var dataLength = Math.ceil(data_rate_field.val() * (tickDelay / 8));
		cobsReader.AppendToBuffer(inputData.slice(0, dataLength), process_binary_datastream);
		setReplayPosition(replay_point + dataLength);

		setTimeout(function () {
			simulateData(inputData.slice(dataLength), tickDelay);
		}, tickDelay);
	}

	function fireOffStop() {
		data_mode = "idle";
	}

	$('.datastream-replay #play').click(function () {
		console.log('click play', $(this));
		// TODO
		// turn off serial port if necessary
		// set mode to replay
		// advance to slider position in replay_buffer
		// read and feed while adjusting slider position

		// drive everything via the slider value update -- send a chunk of bytes and then advance on a timer.

		//$('.datastream-replay .slider').slider( "option", "value", replay_buffer.length );
		if (data_mode === "replay")
			return;
		if (data_mode === "serial")
			connect_disconnect();
		data_mode = "replay";

		setTimeout(function () {
			simulateData(replay_buffer.slice(replay_point), 50);
		}, 100);
	});

	$('.datastream-replay #pause').click(function () {
		// stop playing
		fireOffStop();
	});

	$('.datastream-replay #stop').click(function () {
		// stop playing
		fireOffStop();
		setReplayPosition(0);
	});
	// TODO
	// deal with slider related events


	// UI
	$('#tuning').load("./tabs/tuning.html");
	$('#sensors').load("./tabs/sensors.html");
	$('#signals').load("./tabs/signals.html");
	$('#vehicle').load("./tabs/vehicle.html");
	$('#motors').load("./tabs/motors.html");
	$('#led').load("./tabs/led.html");
	$('#datastream').load("./tabs/datastream.html");
	$('#config').load("./tabs/config.html");

	$('a.tab-button').click(function (event) {
		event.preventDefault();

		var titlestr = $(this).html();
		var href = $(this).attr('href');
		var tab_index = tab_hrefs.indexOf(href);

		if (!tab_id_initialized[tab_index]) {
			tab_view_init_functions[tab_index]();
			tab_id_initialized[tab_index] = true;

			$(href).dialog({
				modal : false,
				height : 800,
				width : 1100,
				title : titlestr,
				position : {
					my : "top",
					at : "bottom",
					of : $('#menu.tab-button-bar'),
				}
			});

			$(href).parent().draggable({
				containment : [0, 0, 2000, 2000],
			});

			var close_button_selector = $(href).parent().children('.ui-dialog-titlebar').children('button');
			$(close_button_selector).click(function (event) {
				console.log('hide dialog', href, tab_dialog_open, tab_index);
				event.preventDefault();
				setTimeout(function () {
					$(href).parent().css({
						display : "none"
					});
					tab_dialog_open[tab_index] = false;
				}, 1);
			});

			//start by showing dialog
			tab_dialog_open[tab_index] = true;
			//jquery ui starts out with the close button focused...
			$('.ui-dialog :button').blur();
		}

		if (!tab_dialog_open[tab_index]) { //dialog is hidden, show now
			var parent_selector = $(href).parent();
			console.log('show dialog', href);
			setTimeout(function () {
				$(href).parent().css({
					display : "block"
				});
				tab_dialog_open[tab_index] = true;
			}, 1);
		}

		tab_view_eeprom_refresh_functions[tab_index]();

		//bring tab to the front
		setTimeout(function () {
			$(href).parent().children('.ui-dialog-titlebar').mousedown()
		}, 20);

	});

	setTimeout(function () {
		$("[href='#datastream']").click()
	}, 10);

	$('.command-log').click(function (e) {
		var loglines = document.getElementById('command-log').innerHTML.split('<p>');
		var str = "";
		for (var i = 0; i < loglines.length; i++) {
			str += $('<p>' + loglines[i]).text() + '\n';
		}
		console.log(str);
	});

}); // document ready

function command_log(message) {
	var d = new Date();
	var time = ((d.getHours() < 10) ? '0' + d.getHours() : d.getHours())
	 + ':' + ((d.getMinutes() < 10) ? '0' + d.getMinutes() : d.getMinutes())
	 + ':' + ((d.getSeconds() < 10) ? '0' + d.getSeconds() : d.getSeconds())
	 + ':' + ((d.getMilliseconds() < 100) ? '0' + ((d.getMilliseconds() < 10) ? '0' + d.getMilliseconds() : d.getMilliseconds()) : d.getMilliseconds())

	var html = '<p>' + time + ' -- ' + message + '</p>';
	$('.command-log').append(html);
	var bottom = $('.command-log')[0].scrollHeight - $('.command-log').height();
	setTimeout(function () {
		$('.command-log').animate({
			scrollTop : bottom
		}, 500, function () {});
	}, 1);
}

//these functions are used to work with dataviews in eeprom-config.js and in parser.js
//javascript won't pass primitives by reference
function byteRef() {
	this.index = 0;
}
byteRef.prototype.add = function (increment) {
	this.index += increment;
}
function parseFloat32Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		destination[i] = view.getFloat32(byteRef.index, 1);
		byteRef.add(4);
	}
}
function parseInt16Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		destination[i] = view.getInt16(byteRef.index, 1);
		byteRef.add(2);
	}
}
function parseInt8Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		destination[i] = view.getInt8(byteRef.index, 1);
		byteRef.add(1);
	}
}
function parseUint8Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		destination[i] = view.getUint8(byteRef.index, 1);
		byteRef.add(1);
	}
}
function parseUint16Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		destination[i] = view.getUint16(byteRef.index, 1);
		byteRef.add(1);
	}
}
function setFloat32Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		view.setFloat32(byteRef.index, destination[i], 1);
		byteRef.add(4);
	}
}
function setInt8Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		view.setInt8(byteRef.index, destination[i], 1);
		byteRef.add(1);
	}
}
function setUint8Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		view.setUint8(byteRef.index, destination[i], 1);
		byteRef.add(1);
	}
}
function setUint16Array(view, destination, byteRef) {
	for (var i = 0; i < destination.length; i++) {
		view.setUint16(byteRef.index, destination[i], 1);
		byteRef.add(2);
	}
}

// these functions are used to connect model values to fields in the views
function loadArrayValues(fields, source, displaylength) {
	fields.each(function (i, f) {
		if (i < source.length) {
			$(f).val((source[i] * 1.0).toFixed(displaylength));
		}
	});
}

function setArrayValues(fields, source) {
	fields.each(function (i, f) {
		source[i] = $(f).val();
	});
}