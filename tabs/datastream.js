function rate_from_delay(delay) {
	if (delay > 1000) {
		return 0;
	}
	if (delay == 0) {
		return 1000;
	}
	return 1000 / delay;
}

var setTargetDelay;
var old_data_mode;

function initialize_datastream_view() {

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

	$("#current-state .model-change-mask").each(function f() {
		//$(this).prop("checked", state_data_mask[parseInt($(this).attr('id'))]);
		// TODO: fix this!!
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
};

(function() {
		'use strict';

		var datastreamController = function ($scope, $rootScope, $interval) {
				$interval(function () {
						$scope.slowState = $rootScope.state;
						$scope.slowStateUpdateRate = $rootScope.stateUpdateRate;
				}, 150);  // throttle redraw to 6-7Hz

				$scope.$watch('targetDelay', function (value) {
						if (value === undefined)
								return;
						$scope.targetRate = rate_from_delay(value);
						var bytes = [value % 256, value / 256]; //little endian
						send_message(CommandFields.COM_SET_STATE_DELAY | CommandFields.COM_REQ_RESPONSE, new Uint8Array(bytes));
				});

				setTargetDelay = function (delay) {
						$scope.$apply(function () {
								$scope.targetDelay = delay;
						});
				};
		};

		angular.module('flybrixApp').controller('datastreamController', ['$scope', '$rootScope', '$interval', datastreamController]);
}());
