
function initialize_tuning_view() {
	$('#Fz-master-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Tx-master-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Ty-master-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Tz-master-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Fz-slave-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Tx-slave-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Ty-slave-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);
	$('#Tz-slave-plot').create_plot(["setpoint", "input", "P", "I", "D", "output"]);

	$(".pid-tuner-label.0").html("Proportional Gain");
	$(".pid-tuner-label.1").html("Integral Gain");
	$(".pid-tuner-label.2").html("Derivative Gain");
	$(".pid-tuner-label.3").html("Integral Limit");
	$(".pid-tuner-label.4").html("Derivative Filter");
	$(".pid-tuner-label.5").html("Setpoint Filter");
	$(".pid-tuner-label.bypass").html("Bypass Controller");

	// accept only numeric input on model-entry-fields
	$('#tuning .pid-tuner-entry-field').keydown(function (e) {
        // Allow: backspace, delete, tab, escape, enter, '.', and '-'
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190, 189]) !== -1 ||
			// Allow: Ctrl+A
			(e.keyCode == 65 && e.ctrlKey === true) ||
			// Allow: Ctrl+C
			(e.keyCode == 67 && e.ctrlKey === true) ||
			// Allow: Ctrl+X
			(e.keyCode == 88 && e.ctrlKey === true) ||
			// Allow: home, end, left, right
			(e.keyCode >= 35 && e.keyCode <= 39)) {
			// let it happen, don't do anything
			return;
		}
		// Ensure that it is a number and stop the keypress
		if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
			e.preventDefault();
		}
	});

	$('#tuning .pid-tuner-entry-field').connect_to_eeprom();
	$('#tuning .pid-tuner-checkbox-bypass').connect_to_eeprom();
    eeprom_refresh_callback_list.add(refresh_tuning_view_from_eepromConfig);

    refresh_tuning_view_from_eepromConfig();
};

function refresh_tuning_view_from_eepromConfig() {
	//populate using eepromConfig data
	loadArrayValues($(".pid-tuner-entry-field.thrustMasterPIDParameters "), eepromConfig.thrustMasterPIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.pitchMasterPIDParameters "), eepromConfig.pitchMasterPIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.rollMasterPIDParameters "), eepromConfig.rollMasterPIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.yawMasterPIDParameters "), eepromConfig.yawMasterPIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.thrustSlavePIDParameters "), eepromConfig.thrustSlavePIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.pitchSlavePIDParameters "), eepromConfig.pitchSlavePIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.rollSlavePIDParameters "), eepromConfig.rollSlavePIDParameters, 4);
	loadArrayValues($(".pid-tuner-entry-field.yawSlavePIDParameters "), eepromConfig.yawSlavePIDParameters, 4);

	//bitfield order for bypass: {thrustMaster, pitchMaster, rollMaster, yawMaster, thrustSlave, pitchSlave, rollSlave, yawSlave} (LSB-->MSB)
	$('#tuning input.bitfield.0').prop("checked", ((eepromConfig.pidBypass >> 0) & 1))
	$('#tuning input.bitfield.1').prop("checked", ((eepromConfig.pidBypass >> 1) & 1))
	$('#tuning input.bitfield.2').prop("checked", ((eepromConfig.pidBypass >> 2) & 1))
	$('#tuning input.bitfield.3').prop("checked", ((eepromConfig.pidBypass >> 3) & 1))
	$('#tuning input.bitfield.4').prop("checked", ((eepromConfig.pidBypass >> 4) & 1))
	$('#tuning input.bitfield.5').prop("checked", ((eepromConfig.pidBypass >> 5) & 1))
	$('#tuning input.bitfield.6').prop("checked", ((eepromConfig.pidBypass >> 6) & 1))
	$('#tuning input.bitfield.7').prop("checked", ((eepromConfig.pidBypass >> 7) & 1))
}

(function() {
		'use strict';

		var tuningController = function ($scope) {
				$scope.getPidValues = function (value) {
						if (!value)
								return [];
						return [
								value[2],
								value[1],
								value[3],
								value[4],
								value[5],
								value[3] + value[4] + value[5],
						];
				};
		};

		angular.module('flybrixApp').controller('tuningController', ['$scope', tuningController]);
}());
