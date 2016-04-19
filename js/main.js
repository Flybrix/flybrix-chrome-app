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


// keep track of tabs (fix this with something less hacky someday)
var tab_id_initialized = [false, false, false, false, false, false, false];
var tab_dialog_open = [false, false, false, false, false, false, false];
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

var serialHelper;  // TODO: remove this once we achieve full AngularJS integration

var initial_config_request = null;

$(document).ready(function () {

	chrome.app.window.current().outerBounds.maxHeight = 0;
	chrome.app.window.current().outerBounds.maxWidth = 0;

	function setReplayPosition(position) {
		replay_point = position;
		$('.datastream-replay .slider').slider("value", position);
		$('.datastream-replay .datastream-report').html(position);
	}

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
		serialHelper.read(inputData.slice(0, dataLength));
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
		byteRef.add(2);
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

(function() {
	'use strict';

	var mainController = function ($scope, $rootScope, $timeout, $interval, serial, commandLog, deviceConfig) {
		var tabClick = function (tab) {
			var titlestr = tab.label;
			var href = '#' + tab.url;

			if (!tab.initialized) {
				tab.initialized = true;
				tab.open = false;

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
					console.log('hide dialog', href, tab.open);
					event.preventDefault();
					setTimeout(function () {
						$(href).parent().css({
							display : "none"
						});
						tab.open = false;
					}, 1);
				});

				//start by showing dialog
				tab.open = true;
				//jquery ui starts out with the close button focused...
				$('.ui-dialog :button').blur();
			}

			if (!tab.open) { //dialog is hidden, show now
				var parent_selector = $(href).parent();
				console.log('show dialog', href);
				setTimeout(function () {
					$(href).parent().css({
						display : "block"
					});
					tab.open = true;
				}, 1);
			}

			//bring tab to the front
			setTimeout(function () {
				$(href).parent().children('.ui-dialog-titlebar').mousedown()
			}, 20);

		};

		$scope.devices = [];
		$scope.deviceChoice = undefined;

		function disconnectSerialIfSamePath(devices, path) {
			var serialPath = serial.getPath();
			var connectedPort = devices.find(function (val) {
				return val === serialPath;
			});
			if (connectedPort !== undefined)
				$scope.disconnect();
		}

		function refreshPortSelector() {
			serial.getDevices().then(function (ports) {
				var devices = ports.map(function (port) {
					return port.path;
				});

				var diffPorts = diff($scope.devices, devices);
				if (diffPorts.lenght > 0) {
					console.log('Ports unplugged:', diff_ports);
				}
				diffPorts = diff(devices, $scope.devices);
				if (diffPorts.lenght > 0) {
					console.log('Ports found:', diff_ports);
				}
				$scope.devices = devices;
			});
		}

		$scope.isConnected = function() {
			return serial.isConnected();
		}

		var initial_config_request;

		$scope.connect = function () {
			console.log('Connecting to: ' + $scope.deviceChoice);

			var onSuccess = function () {
					data_mode = "serial";

					initial_config_request = $timeout(function() {
							// request configuration data (so we have something to work with)
							deviceConfig.request();

							// set the state message mask and frequency
							$timeout(function() {
									var default_delay_msec = 50;

									serial.send(
											serial.field.COM_SET_STATE_MASK | serial.field.COM_SET_STATE_DELAY,
											new Uint8Array([255, 255, 255, 255, default_delay_msec % 256, default_delay_msec / 256]));
									// update fields in datastream tab
									setTargetDelay(default_delay_msec);
							}, 100);

					}, 500);
			};

			serial.connect($scope.deviceChoice).then(onSuccess);
		};

		$scope.disconnect = function () {
			console.log('Disconnecting from: ' + serial.getPath());

			serial.disconnect();

			// if we disconnect before we ask for initial config data
			$timeout.cancel(initial_config_request);

			// Reset port usage indicator to 0
			$('span.port-usage').html(0 + ' kbps');  // TODO: handle this more elegantly

			data_mode = "idle";
		};

		$scope.tabs = [
			{url:'tuning', label:'Tuning'},
			{url:'sensors', label:'Sensor Data'},
			{url:'signals', label:'R/C Signals'},
			{url:'vehicle', label:'Vehicle View'},
			{url:'motors', label:'Motors'},
			{url:'led', label:'LED'},
			{url:'datastream', label:'Datastream'},
			{url:'config', label:'Configuration'}
		];

		$scope.tabClick = tabClick;

		$rootScope.updateEeprom = function () {
				deviceConfig.send($rootScope.eepromConfig);
		}

		serial.setStateCallback(function (state, state_data_mask, serial_update_rate) {
				$rootScope.$apply(function () {
						$rootScope.state = state;
						$rootScope.stateDataMask = state_data_mask;
						$rootScope.stateUpdateRate = serial_update_rate;
				});
		});

		deviceConfig.setConfigCallback(function () {
				$rootScope.$apply(function () {
						$rootScope.eepromConfig = deviceConfig.getConfig();
				});
		})

		$rootScope.$watch('state', function () {
				if (!$rootScope.state)
						return;

				var kV0 = (20.5 + 226) / 20.5 * 1.2 / 65536;
				var kI0 = 1000 * (1 / 50) / 0.003 * 1.2 / 65536;
				var kI1 = 1000 * (1 / 50) / 0.03 * 1.2 / 65536;

				$rootScope.batteryData = [
						kV0 * $rootScope.state.V0_raw,
						kI0 * $rootScope.state.I0_raw,
						kI1 * $rootScope.state.I1_raw,
						kI0 * kV0 * $rootScope.state.V0_raw * $rootScope.state.I0_raw,
						kI1 * kV0 * $rootScope.state.V0_raw * $rootScope.state.I1_raw,
				];
		});

		$scope.$watch('devices', function (devices) {
			console.log("PING");
			disconnectSerialIfSamePath(devices, serial.getPath());
			if ($scope.deviceChoice === undefined) {
				chrome.storage.local.get('last_used_port', function (result) {
					$scope.deviceChoice = result.last_used_port;
				});
			}
		}, true);

		function autoConnectIfExists() {
			if (!$scope.autoConnect)
				return;
			var chosenDevice = $scope.devices.find(function (elem) {
				return elem === $scope.deviceChoice;
			});
			console.log("CHOSEN DEVICE", chosenDevice);
			if (chosenDevice === undefined)
				return;
			$scope.connect();
		}

		$scope.$watch('deviceChoice', autoConnectIfExists);

		chrome.storage.local.get('auto_connect', function (result) {
			if (result.auto_connect === 'undefined' || result.auto_connect) {
				$scope.autoConnect = true;
			} else {
				$scope.autoConnect = false;
			}
		});

		$scope.$watch('autoConnect', function(val) {
			if (val === undefined)
					return;
			auto_connect = val;
			chrome.storage.local.set({
				'auto_connect' : auto_connect
			});
			autoConnectIfExists();
		});

		$interval(refreshPortSelector, 200);

		serialHelper = serial;
	};

	var app = angular.module('flybrixApp');

	app.factory('commandLog', function () {
			return command_log;
	});

	app.controller('mainController', ['$scope', '$rootScope', '$timeout', '$interval', 'serial', 'commandLog', 'deviceConfig', mainController]);

	app.directive('eepromInput', function () {
			return {
					template: '<label class="model-entry-label">{{label}}<input class="model-entry-field" type="number" step="{{precision}}" ng-model="field" ng-model-options="{updateOn:\'change\'}" ng-change="onChange()"></input></label>',
					scope: true,
					require: '?ngModel',
					priority: 1,
					link: function (scope, element, attrs, ngModel) {
							if (!ngModel)
									return;

							scope.onChange = function () {
									ngModel.$setViewValue(scope.field);
									scope.$root.updateEeprom();
							};

							ngModel.$render = function () {
									if (attrs.precision !== undefined)
											scope.precision = parseFloat(attrs.precision);
									else
											scope.precision = 0;
									if (ngModel.$modelValue !== undefined)
											scope.field = parseFloat(ngModel.$modelValue.toFixed(scope.precision));
									scope.label = attrs.label;
							};
					},
			};
	});
}());
